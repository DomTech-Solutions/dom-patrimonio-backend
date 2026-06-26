-- 1. Remoção segura de tabelas antigas de desenvolvimento para atualização de chaves estrangeiras
DROP TABLE IF EXISTS public.transactions;
DROP TABLE IF EXISTS public.rules;
DROP TABLE IF EXISTS public.categories;
DROP TABLE IF EXISTS public.profiles;

-- 2. Recriação da tabela Profiles vinculada ao Supabase Auth
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'manager' CHECK (role IN ('admin', 'manager', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Recriação das tabelas de negócio com UUID referenciando o novo Profiles
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    macro TEXT NOT NULL,
    micro TEXT NOT NULL,
    nature TEXT NOT NULL CHECK (nature IN ('Fixo', 'Variável', 'Receita')),
    UNIQUE(profile_id, macro, micro)
);

CREATE TABLE public.rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    keywords JSONB NOT NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 0
);

CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date_payment DATE NOT NULL,
    date_occurrence DATE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Receita', 'Despesa')),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    source TEXT NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    parent_transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Reativação da trigger temporal de Transactions
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transactions_modtime
BEFORE UPDATE ON transactions
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 5. Ativação do Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 6. Definição de Políticas de Segurança (Policies)

-- A. Políticas para 'profiles'
CREATE POLICY select_profiles ON public.profiles
    FOR SELECT TO authenticated USING (auth.role() = 'authenticated');

CREATE POLICY insert_profiles ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY update_profiles ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- B. Políticas para 'categories'
CREATE POLICY all_categories ON public.categories
    FOR ALL TO authenticated USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

-- C. Políticas para 'rules'
CREATE POLICY all_rules ON public.rules
    FOR ALL TO authenticated USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

-- D. Políticas para 'transactions'
CREATE POLICY all_transactions ON public.transactions
    FOR ALL TO authenticated USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
