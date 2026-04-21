-- Sesiones de caja y movimientos de efectivo
-- Una sesión agrupa todas las ventas y movimientos entre apertura y cierre de turno.
-- Las ventas quedan vinculadas automáticamente a la sesión abierta de la cajera.

CREATE TYPE public.cash_session_status AS ENUM ('open', 'closing', 'closed');
CREATE TYPE public.cash_movement_type AS ENUM ('drop', 'pickup', 'expense');

CREATE TABLE public.cash_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cashier_id UUID NOT NULL REFERENCES public.profiles(id),
    status public.cash_session_status NOT NULL DEFAULT 'open',
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ,

    opening_float NUMERIC(12,2) NOT NULL CHECK (opening_float >= 0),

    -- conteo al cierre: { "bills": {"1000":0,...}, "coins": {"10":0,...} }
    closing_counts JSONB,
    closing_cash_counted NUMERIC(12,2),
    closing_notes TEXT DEFAULT '',
    closed_by UUID REFERENCES public.profiles(id),

    -- snapshot de totales congelados al cerrar
    expected_cash NUMERIC(12,2),
    cash_sales NUMERIC(12,2),
    card_sales NUMERIC(12,2),
    transfer_sales NUMERIC(12,2),
    total_drops NUMERIC(12,2),
    total_pickups NUMERIC(12,2),
    total_expenses NUMERIC(12,2),
    total_refunds NUMERIC(12,2),
    sales_count INTEGER,

    -- diferencia = contado - esperado. Positiva = sobrante, negativa = faltante.
    difference NUMERIC(12,2) GENERATED ALWAYS AS (
        COALESCE(closing_cash_counted, 0) - COALESCE(expected_cash, 0)
    ) STORED,

    reopened_from_id UUID REFERENCES public.cash_sessions(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT valid_close CHECK (
        (status = 'closed' AND closed_at IS NOT NULL AND closing_cash_counted IS NOT NULL)
        OR status <> 'closed'
    ),
    CONSTRAINT valid_closing_counts CHECK (
        closing_counts IS NULL OR (
            closing_counts ? 'bills' AND closing_counts ? 'coins'
            AND jsonb_typeof(closing_counts->'bills') = 'object'
            AND jsonb_typeof(closing_counts->'coins') = 'object'
        )
    )
);

-- Una cajera no puede tener dos sesiones abiertas al mismo tiempo.
CREATE UNIQUE INDEX idx_cash_sessions_one_open_per_cashier
    ON public.cash_sessions(cashier_id)
    WHERE status IN ('open', 'closing');

CREATE INDEX idx_cash_sessions_opened_at ON public.cash_sessions(opened_at DESC);
CREATE INDEX idx_cash_sessions_cashier ON public.cash_sessions(cashier_id);
CREATE INDEX idx_cash_sessions_status ON public.cash_sessions(status);

CREATE TRIGGER handle_cash_sessions_updated_at
    BEFORE UPDATE ON public.cash_sessions
    FOR EACH ROW
    EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE TABLE public.cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.cash_sessions(id) ON DELETE RESTRICT,
    type public.cash_movement_type NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL CHECK (length(trim(reason)) > 0),
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cash_movements_session ON public.cash_movements(session_id);
CREATE INDEX idx_cash_movements_created_at ON public.cash_movements(created_at DESC);

-- Vincular ventas a sesión
ALTER TABLE public.sales ADD COLUMN session_id UUID REFERENCES public.cash_sessions(id);
CREATE INDEX idx_sales_session ON public.sales(session_id);

-- Antes de cada venta, asigna la sesión abierta de la cajera.
-- Si no hay sesión abierta, falla con un error que la UI puede mostrar.
CREATE OR REPLACE FUNCTION public.assign_sale_to_open_session()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_session UUID;
BEGIN
    IF NEW.session_id IS NULL THEN
        SELECT id INTO v_session
          FROM public.cash_sessions
         WHERE cashier_id = NEW.cashier_id AND status = 'open'
         LIMIT 1;

        IF v_session IS NULL THEN
            RAISE EXCEPTION 'No hay caja abierta. Abre una sesión de caja antes de vender.'
                USING ERRCODE = 'P0001';
        END IF;

        NEW.session_id := v_session;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_sale_session
    BEFORE INSERT ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_sale_to_open_session();

-- Suma el conteo de billetes y monedas de un JSONB {bills:{}, coins:{}}
CREATE OR REPLACE FUNCTION public.sum_denomination_counts(p_counts JSONB)
RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    v_total NUMERIC := 0;
    v_key TEXT;
    v_qty NUMERIC;
BEGIN
    IF p_counts IS NULL THEN
        RETURN 0;
    END IF;

    FOR v_key, v_qty IN SELECT * FROM jsonb_each_text(p_counts->'bills') LOOP
        v_total := v_total + (v_key::NUMERIC * v_qty::NUMERIC);
    END LOOP;

    FOR v_key, v_qty IN SELECT * FROM jsonb_each_text(p_counts->'coins') LOOP
        v_total := v_total + (v_key::NUMERIC * v_qty::NUMERIC);
    END LOOP;

    RETURN v_total;
END;
$$;

-- Devuelve lo esperado en efectivo de una sesión abierta, para mostrar en vivo.
CREATE OR REPLACE FUNCTION public.get_session_expected_cash(p_session_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_session public.cash_sessions%ROWTYPE;
    v_cash NUMERIC; v_card NUMERIC; v_transfer NUMERIC;
    v_drops NUMERIC; v_pickups NUMERIC; v_expenses NUMERIC; v_refunds NUMERIC;
    v_sales_count INTEGER;
    v_expected NUMERIC;
BEGIN
    SELECT * INTO v_session FROM public.cash_sessions WHERE id = p_session_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sesión no encontrada';
    END IF;

    SELECT
        COALESCE(SUM(total) FILTER (WHERE payment_method='cash' AND status='completed'), 0),
        COALESCE(SUM(total) FILTER (WHERE payment_method='card' AND status='completed'), 0),
        COALESCE(SUM(total) FILTER (WHERE payment_method='transfer' AND status='completed'), 0),
        COALESCE(SUM(total) FILTER (WHERE status='cancelled'), 0),
        COUNT(*) FILTER (WHERE status='completed')
    INTO v_cash, v_card, v_transfer, v_refunds, v_sales_count
    FROM public.sales
    WHERE session_id = p_session_id;

    SELECT
        COALESCE(SUM(amount) FILTER (WHERE type='drop'), 0),
        COALESCE(SUM(amount) FILTER (WHERE type='pickup'), 0),
        COALESCE(SUM(amount) FILTER (WHERE type='expense'), 0)
    INTO v_drops, v_pickups, v_expenses
    FROM public.cash_movements
    WHERE session_id = p_session_id;

    v_expected := v_session.opening_float + v_cash + v_pickups - v_drops - v_expenses;

    RETURN jsonb_build_object(
        'opening_float', v_session.opening_float,
        'cash_sales', v_cash,
        'card_sales', v_card,
        'transfer_sales', v_transfer,
        'total_drops', v_drops,
        'total_pickups', v_pickups,
        'total_expenses', v_expenses,
        'total_refunds', v_refunds,
        'sales_count', v_sales_count,
        'expected_cash', v_expected
    );
END;
$$;

-- Cierra una sesión atómicamente: calcula totales, valida, congela snapshot.
CREATE OR REPLACE FUNCTION public.close_cash_session(
    p_session_id UUID,
    p_closing_counts JSONB,
    p_notes TEXT DEFAULT ''
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_session public.cash_sessions%ROWTYPE;
    v_totals JSONB;
    v_counted NUMERIC;
    v_expected NUMERIC;
BEGIN
    SELECT * INTO v_session FROM public.cash_sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sesión no encontrada';
    END IF;

    IF v_session.status = 'closed' THEN
        RAISE EXCEPTION 'La sesión ya está cerrada';
    END IF;

    IF v_session.cashier_id <> auth.uid()
       AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Solo la cajera dueña o un admin pueden cerrar la sesión';
    END IF;

    v_totals := public.get_session_expected_cash(p_session_id);
    v_expected := (v_totals->>'expected_cash')::NUMERIC;
    v_counted := public.sum_denomination_counts(p_closing_counts);

    UPDATE public.cash_sessions SET
        status = 'closed',
        closed_at = now(),
        closed_by = auth.uid(),
        closing_counts = p_closing_counts,
        closing_cash_counted = v_counted,
        closing_notes = COALESCE(p_notes, ''),
        expected_cash = v_expected,
        cash_sales = (v_totals->>'cash_sales')::NUMERIC,
        card_sales = (v_totals->>'card_sales')::NUMERIC,
        transfer_sales = (v_totals->>'transfer_sales')::NUMERIC,
        total_drops = (v_totals->>'total_drops')::NUMERIC,
        total_pickups = (v_totals->>'total_pickups')::NUMERIC,
        total_expenses = (v_totals->>'total_expenses')::NUMERIC,
        total_refunds = (v_totals->>'total_refunds')::NUMERIC,
        sales_count = (v_totals->>'sales_count')::INTEGER
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'expected_cash', v_expected,
        'counted', v_counted,
        'difference', v_counted - v_expected
    );
END;
$$;

ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY cash_sessions_select_own_or_admin ON public.cash_sessions
    FOR SELECT USING (
        cashier_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY cash_sessions_insert_own ON public.cash_sessions
    FOR INSERT WITH CHECK (
        cashier_id = auth.uid()
        AND status = 'open'
    );

CREATE POLICY cash_sessions_update_own_or_admin ON public.cash_sessions
    FOR UPDATE USING (
        (cashier_id = auth.uid() AND status <> 'closed')
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY cash_movements_select ON public.cash_movements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.cash_sessions s
            WHERE s.id = session_id
              AND (s.cashier_id = auth.uid()
                   OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
        )
    );

CREATE POLICY cash_movements_insert ON public.cash_movements
    FOR INSERT WITH CHECK (
        created_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.cash_sessions s
            WHERE s.id = session_id
              AND s.status = 'open'
              AND s.cashier_id = auth.uid()
        )
    );

-- Realtime para que el admin vea sesiones actualizándose en vivo
ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_movements;

COMMENT ON TABLE public.cash_sessions IS 'Turnos de caja: apertura, movimientos y cierre con arqueo.';
COMMENT ON TABLE public.cash_movements IS 'Retiros, ingresos y gastos de efectivo durante una sesión.';
