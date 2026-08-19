DO $$
DECLARE
    r RECORD;
    tables_to_enable TEXT[] := ARRAY[
        'marketing_campaigns',
        'automation_rules',
        'durable_jobs',
        'audit_logs',
        'ai_model_registry',
        'provider_connections',
        'marketing_budgets',
        'ai_model_versions',
        'ai_prompt_registry',
        'ai_prediction_events',
        'ai_recommendations',
        'ai_recommendation_actions',
        'ai_explanations',
        'ai_feature_definitions',
        'ai_feature_snapshots',
        'ai_training_runs',
        'ai_evaluation_runs',
        'ai_drift_metrics',
        'marketing_experiments',
        'marketing_experiment_variants',
        'marketing_experiment_assignments',
        'marketing_experiment_outcomes',
        'marketing_bandit_states',
        'marketing_causal_estimates',
        'marketing_budget_scenarios',
        'marketing_optimizer_runs',
        'marketing_optimizer_allocations',
        'marketing_competitors',
        'marketing_competitor_signals',
        'marketing_trend_signals',
        'marketing_creative_attributes',
        'marketing_creative_scores',
        'marketing_lifecycle_segments',
        'marketing_capacity_snapshots',
        'marketing_data_quality_metrics',
        'marketing_intelligence_briefs',
        'auth_identities_dump',
        'staff_profiles',
        'auth_dump',
        'auth_dump2'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY tables_to_enable
    LOOP
        IF EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = t
        ) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        END IF;
    END LOOP;
END
$$;
