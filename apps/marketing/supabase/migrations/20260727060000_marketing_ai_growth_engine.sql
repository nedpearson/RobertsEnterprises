-- Migration: 20260727060000_marketing_ai_growth_engine.sql
-- Description: Proper & Co Marketing AI Growth Engine Relational Schemas

-- 1. ai_model_registry
CREATE TABLE IF NOT EXISTS ai_model_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL UNIQUE,
    task_type VARCHAR(100) NOT NULL, -- e.g. 'lead_scoring', 'budget_optimizer', 'creative_intelligence'
    provider VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'classical_ml', 'heuristic'
    default_version VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ai_model_versions
CREATE TABLE IF NOT EXISTS ai_model_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL REFERENCES ai_model_registry(model_name),
    version VARCHAR(50) NOT NULL,
    hyperparameters JSONB DEFAULT '{}',
    metrics JSONB DEFAULT '{}',
    is_shadow BOOLEAN DEFAULT false,
    deployed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(model_name, version)
);

-- 3. ai_prompt_registry
CREATE TABLE IF NOT EXISTS ai_prompt_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id VARCHAR(100) NOT NULL,
    task VARCHAR(100) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    system_prompt TEXT NOT NULL,
    input_schema JSONB DEFAULT '{}',
    output_schema JSONB DEFAULT '{}',
    safety_rules JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(prompt_id, version)
);

-- 4. ai_prediction_events
CREATE TABLE IF NOT EXISTS ai_prediction_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    prediction JSONB NOT NULL,
    confidence NUMERIC(5,4),
    features_used JSONB DEFAULT '{}',
    latency_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ai_recommendations
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    category VARCHAR(100) NOT NULL, -- 'budget', 'creative', 'lead', 'product', 'campaign'
    title VARCHAR(255) NOT NULL,
    business_objective TEXT NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    expected_impact JSONB NOT NULL, -- e.g. { "incremental_gross_profit_cents": 125000 }
    confidence_score NUMERIC(5,4) NOT NULL,
    evidence JSONB DEFAULT '[]',
    data_freshness_seconds INTEGER,
    financial_exposure_cents BIGINT DEFAULT 0,
    required_governance_level INTEGER NOT NULL, -- 1=Advisory, 2=Approval, 3=Autonomy
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'dismissed', 'snoozed', 'executed'
    dismissal_reason TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. ai_recommendation_actions
CREATE TABLE IF NOT EXISTS ai_recommendation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID REFERENCES ai_recommendations(id),
    executed_by VARCHAR(255) NOT NULL, -- 'user_uuid' or 'autonomous_engine'
    action_payload JSONB NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    execution_status VARCHAR(50) DEFAULT 'completed',
    error_message TEXT,
    executed_at TIMESTAMPTZ DEFAULT now()
);

-- 7. ai_explanations
CREATE TABLE IF NOT EXISTS ai_explanations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID REFERENCES ai_recommendations(id),
    top_factors JSONB NOT NULL,
    counterfactual_summary TEXT,
    limitations TEXT,
    data_window_start TIMESTAMPTZ,
    data_window_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. ai_feature_definitions
CREATE TABLE IF NOT EXISTS ai_feature_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_group VARCHAR(100) NOT NULL, -- 'campaign', 'creative', 'customer', 'product', 'market'
    name VARCHAR(100) NOT NULL UNIQUE,
    data_type VARCHAR(50) NOT NULL,
    transformation TEXT,
    freshness_sla_seconds INTEGER DEFAULT 3600,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. ai_feature_snapshots
CREATE TABLE IF NOT EXISTS ai_feature_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_group VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    features JSONB NOT NULL,
    snapshot_timestamp TIMESTAMPTZ DEFAULT now()
);

-- 10. ai_training_runs
CREATE TABLE IF NOT EXISTS ai_training_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL,
    dataset_split JSONB NOT NULL,
    training_metrics JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'completed',
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ DEFAULT now()
);

-- 11. ai_evaluation_runs
CREATE TABLE IF NOT EXISTS ai_evaluation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL,
    evaluation_type VARCHAR(100) NOT NULL, -- 'offline_backtest', 'shadow_mode', 'live_monitoring'
    eval_metrics JSONB NOT NULL, -- e.g. { "roc_auc": 0.89, "mae": 45.2, "brier": 0.11 }
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. ai_drift_metrics
CREATE TABLE IF NOT EXISTS ai_drift_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL, -- 'concept_drift', 'covariate_shift', 'calibration_error'
    value NUMERIC(10,4) NOT NULL,
    alert_triggered BOOLEAN DEFAULT false,
    recorded_at TIMESTAMPTZ DEFAULT now()
);

-- 13. marketing_experiments
CREATE TABLE IF NOT EXISTS marketing_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    hypothesis TEXT NOT NULL,
    experiment_type VARCHAR(100) NOT NULL, -- 'ab_test', 'bandit', 'holdout', 'synthetic_control'
    primary_metric VARCHAR(100) NOT NULL,
    guardrail_metrics JSONB DEFAULT '[]',
    min_sample_size INTEGER DEFAULT 1000,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'running', 'paused', 'completed'
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. marketing_experiment_variants
CREATE TABLE IF NOT EXISTS marketing_experiment_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID REFERENCES marketing_experiments(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    allocation_pct NUMERIC(5,2) DEFAULT 50.0,
    config JSONB DEFAULT '{}',
    is_control BOOLEAN DEFAULT false
);

-- 15. marketing_experiment_assignments
CREATE TABLE IF NOT EXISTS marketing_experiment_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID REFERENCES marketing_experiments(id),
    variant_id UUID REFERENCES marketing_experiment_variants(id),
    subject_id VARCHAR(255) NOT NULL, -- customer_id, session_id, ad_id
    assigned_at TIMESTAMPTZ DEFAULT now()
);

-- 16. marketing_experiment_outcomes
CREATE TABLE IF NOT EXISTS marketing_experiment_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID REFERENCES marketing_experiments(id),
    variant_id UUID REFERENCES marketing_experiment_variants(id),
    subject_id VARCHAR(255) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    value NUMERIC(12,4) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT now()
);

-- 17. marketing_bandit_states
CREATE TABLE IF NOT EXISTS marketing_bandit_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID REFERENCES marketing_experiments(id),
    variant_id UUID REFERENCES marketing_experiment_variants(id),
    alpha NUMERIC(12,4) DEFAULT 1.0, -- Successes pseudo-count
    beta NUMERIC(12,4) DEFAULT 1.0,  -- Failures pseudo-count
    current_weight NUMERIC(5,4) DEFAULT 0.5,
    last_updated_at TIMESTAMPTZ DEFAULT now()
);

-- 18. marketing_causal_estimates
CREATE TABLE IF NOT EXISTS marketing_causal_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand VARCHAR(100) NOT NULL,
    campaign_id VARCHAR(255),
    method VARCHAR(100) NOT NULL, -- 'diff_in_diff', 'synthetic_control', 'matched_market'
    platform_attributed_cents BIGINT DEFAULT 0,
    incremental_revenue_cents BIGINT DEFAULT 0,
    incremental_gross_profit_cents BIGINT DEFAULT 0,
    confidence_interval_95 JSONB NOT NULL, -- { "lower_cents": 80000, "upper_cents": 140000 }
    estimated_at TIMESTAMPTZ DEFAULT now()
);

-- 19. marketing_budget_scenarios
CREATE TABLE IF NOT EXISTS marketing_budget_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    proposed_monthly_spend_cents BIGINT NOT NULL,
    platform_allocations JSONB NOT NULL, -- { "meta": 500000, "google": 300000, "pinterest": 200000 }
    predicted_leads INTEGER,
    predicted_appointments INTEGER,
    predicted_sales_cents BIGINT,
    predicted_gross_profit_cents BIGINT,
    confidence_interval JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 20. marketing_optimizer_runs
CREATE TABLE IF NOT EXISTS marketing_optimizer_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand VARCHAR(100) NOT NULL,
    objective VARCHAR(100) NOT NULL DEFAULT 'incremental_gross_profit',
    total_budget_limit_cents BIGINT NOT NULL,
    constraints JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'completed',
    ran_at TIMESTAMPTZ DEFAULT now()
);

-- 21. marketing_optimizer_allocations
CREATE TABLE IF NOT EXISTS marketing_optimizer_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES marketing_optimizer_runs(id),
    provider VARCHAR(50) NOT NULL,
    campaign_id VARCHAR(255),
    recommended_budget_cents BIGINT NOT NULL,
    marginal_return_ratio NUMERIC(6,3),
    is_binding BOOLEAN DEFAULT false
);

-- 22. marketing_competitors
CREATE TABLE IF NOT EXISTS marketing_competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'local_bridal', 'formalwear', 'national_ecom'
    website_url TEXT,
    public_social_handles JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 23. marketing_competitor_signals
CREATE TABLE IF NOT EXISTS marketing_competitor_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_id UUID REFERENCES marketing_competitors(id),
    source VARCHAR(100) NOT NULL, -- 'meta_ad_library', 'google_ads_transparency', 'public_web'
    signal_type VARCHAR(100) NOT NULL, -- 'new_campaign', 'pricing_change', 'creative_theme'
    headline TEXT,
    summary TEXT,
    public_url TEXT,
    detected_at TIMESTAMPTZ DEFAULT now()
);

-- 24. marketing_trend_signals
CREATE TABLE IF NOT EXISTS marketing_trend_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    growth_velocity NUMERIC(6,2), -- e.g. +45.5%
    relevance_score NUMERIC(5,4),
    matched_inventory_ids JSONB DEFAULT '[]',
    detected_at TIMESTAMPTZ DEFAULT now()
);

-- 25. marketing_creative_attributes
CREATE TABLE IF NOT EXISTS marketing_creative_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creative_id VARCHAR(255) NOT NULL UNIQUE,
    brand VARCHAR(100) NOT NULL,
    visual_style VARCHAR(100),
    dominant_colors JSONB DEFAULT '[]',
    has_human_model BOOLEAN DEFAULT false,
    text_density_pct NUMERIC(5,2),
    aspect_ratio VARCHAR(20),
    designer VARCHAR(100),
    occasion VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 26. marketing_creative_scores
CREATE TABLE IF NOT EXISTS marketing_creative_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creative_id VARCHAR(255) NOT NULL REFERENCES marketing_creative_attributes(creative_id),
    brand_fit_score NUMERIC(5,2), -- 0-100
    mobile_readability_score NUMERIC(5,2),
    conversion_propensity NUMERIC(5,4),
    fatigue_risk_score NUMERIC(5,2),
    evaluated_at TIMESTAMPTZ DEFAULT now()
);

-- 27. marketing_lifecycle_segments
CREATE TABLE IF NOT EXISTS marketing_lifecycle_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    segment VARCHAR(100) NOT NULL, -- 'new_prospect', 'appointment_no_show', 'high_value_vip'
    ltv_forecast_cents BIGINT,
    churn_risk NUMERIC(5,4),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 28. marketing_capacity_snapshots
CREATE TABLE IF NOT EXISTS marketing_capacity_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location VARCHAR(100) NOT NULL, -- 'Baton Rouge', 'Covington'
    snapshot_date DATE NOT NULL,
    available_appointment_slots INTEGER NOT NULL,
    consultant_capacity_pct NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 29. marketing_data_quality_metrics
CREATE TABLE IF NOT EXISTS marketing_data_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand VARCHAR(100) NOT NULL,
    overall_confidence_score NUMERIC(5,2) NOT NULL, -- 0-100
    freshness_score NUMERIC(5,2),
    attribution_completeness_pct NUMERIC(5,2),
    issues_detected JSONB DEFAULT '[]',
    recorded_at TIMESTAMPTZ DEFAULT now()
);

-- 30. marketing_intelligence_briefs
CREATE TABLE IF NOT EXISTS marketing_intelligence_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand VARCHAR(100) NOT NULL,
    brief_date DATE NOT NULL,
    summary_md TEXT NOT NULL,
    top_growth_opportunities JSONB NOT NULL,
    top_risks JSONB NOT NULL,
    recommended_budget_adjustments JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
