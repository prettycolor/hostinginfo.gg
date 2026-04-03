-- Database Optimization: Add Indexes for Performance
-- Phase 2 Task 2.3: Database Query Optimization
-- Date: 2026-02-10

-- ============================================================================
-- DOMAINS TABLE INDEXES
-- ============================================================================

-- Index for domain lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain);

-- Index for user's domains
CREATE INDEX IF NOT EXISTS idx_domains_user_id ON domains(user_id);

-- Index for verification status queries
CREATE INDEX IF NOT EXISTS idx_domains_verified ON domains(is_verified);

-- Composite index for user's verified domains
CREATE INDEX IF NOT EXISTS idx_domains_user_verified ON domains(user_id, is_verified);

-- Index for expiry monitoring
CREATE INDEX IF NOT EXISTS idx_domains_expiry ON domains(expiry_date);

-- Index for created date (for sorting)
CREATE INDEX IF NOT EXISTS idx_domains_created ON domains(created_at);

-- ============================================================================
-- DOMAIN SCANS TABLE INDEXES
-- ============================================================================

-- Index for domain scan lookups
CREATE INDEX IF NOT EXISTS idx_domain_scans_domain ON domain_scans(domain_id);

-- Index for scan type queries
CREATE INDEX IF NOT EXISTS idx_domain_scans_type ON domain_scans(scan_type);

-- Composite index for domain + scan type
CREATE INDEX IF NOT EXISTS idx_domain_scans_domain_type ON domain_scans(domain_id, scan_type);

-- Index for scan date (for history)
CREATE INDEX IF NOT EXISTS idx_domain_scans_scanned ON domain_scans(scanned_at);

-- Composite index for recent scans by domain
CREATE INDEX IF NOT EXISTS idx_domain_scans_domain_recent ON domain_scans(domain_id, scanned_at DESC);

-- ============================================================================
-- WHOIS HISTORY TABLE INDEXES
-- ============================================================================

-- Index for domain WHOIS history
CREATE INDEX IF NOT EXISTS idx_whois_history_domain ON whois_history(domain_id);

-- Index for change detection
CREATE INDEX IF NOT EXISTS idx_whois_history_changes ON whois_history(has_changes);

-- Composite index for domain changes
CREATE INDEX IF NOT EXISTS idx_whois_history_domain_changes ON whois_history(domain_id, has_changes);

-- Index for snapshot date
CREATE INDEX IF NOT EXISTS idx_whois_history_snapshot ON whois_history(snapshot_date);

-- ============================================================================
-- BATCH ANALYSIS JOBS TABLE INDEXES
-- ============================================================================

-- Index for user's batch jobs
CREATE INDEX IF NOT EXISTS idx_batch_jobs_user ON batch_analysis_jobs(user_id);

-- Index for job status queries
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_analysis_jobs(status);

-- Composite index for user's active jobs
CREATE INDEX IF NOT EXISTS idx_batch_jobs_user_status ON batch_analysis_jobs(user_id, status);

-- Index for worker assignment
CREATE INDEX IF NOT EXISTS idx_batch_jobs_worker ON batch_analysis_jobs(worker_id);

-- Index for job creation date
CREATE INDEX IF NOT EXISTS idx_batch_jobs_created ON batch_analysis_jobs(created_at);

-- ============================================================================
-- SCHEDULED REPORTS TABLE INDEXES
-- ============================================================================

-- Index for user's scheduled reports
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_user ON scheduled_reports(user_id);

-- Index for active reports
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active ON scheduled_reports(is_active);

-- Composite index for user's active reports
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_user_active ON scheduled_reports(user_id, is_active);

-- Index for next run scheduling
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run);

-- ============================================================================
-- MONITORING TABLE INDEXES
-- ============================================================================

-- Index for domain monitoring
CREATE INDEX IF NOT EXISTS idx_monitoring_domain ON monitoring(domain_id);

-- Index for user's monitored domains
CREATE INDEX IF NOT EXISTS idx_monitoring_user ON monitoring(user_id);

-- Index for active monitoring
CREATE INDEX IF NOT EXISTS idx_monitoring_active ON monitoring(is_active);

-- Composite index for user's active monitoring
CREATE INDEX IF NOT EXISTS idx_monitoring_user_active ON monitoring(user_id, is_active);

-- Index for next check scheduling
CREATE INDEX IF NOT EXISTS idx_monitoring_next_check ON monitoring(next_check_at);

-- ============================================================================
-- ALERTS TABLE INDEXES
-- ============================================================================

-- Index for domain alerts
CREATE INDEX IF NOT EXISTS idx_alerts_domain ON alerts(domain_id);

-- Index for user's alerts
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);

-- Index for alert severity
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);

-- Index for unread alerts
CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(is_read);

-- Composite index for user's unread alerts
CREATE INDEX IF NOT EXISTS idx_alerts_user_unread ON alerts(user_id, is_read);

-- Index for alert creation date
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);

-- ============================================================================
-- DOMAIN RELATIONSHIPS TABLE INDEXES
-- ============================================================================

-- Index for source domain relationships
CREATE INDEX IF NOT EXISTS idx_relationships_source ON domain_relationships(source_domain_id);

-- Index for target domain relationships
CREATE INDEX IF NOT EXISTS idx_relationships_target ON domain_relationships(target_domain_id);

-- Index for relationship type
CREATE INDEX IF NOT EXISTS idx_relationships_type ON domain_relationships(relationship_type);

-- Composite index for source + type
CREATE INDEX IF NOT EXISTS idx_relationships_source_type ON domain_relationships(source_domain_id, relationship_type);

-- ============================================================================
-- DOMAIN CLUSTERS TABLE INDEXES
-- ============================================================================

-- Index for cluster confidence
CREATE INDEX IF NOT EXISTS idx_clusters_confidence ON domain_clusters(confidence_score);

-- Index for cluster creation date
CREATE INDEX IF NOT EXISTS idx_clusters_created ON domain_clusters(created_at);

-- ============================================================================
-- CORRELATION EVENTS TABLE INDEXES
-- ============================================================================

-- Index for domain correlation events
CREATE INDEX IF NOT EXISTS idx_correlation_domain ON correlation_events(domain_id);

-- Index for event type
CREATE INDEX IF NOT EXISTS idx_correlation_type ON correlation_events(event_type);

-- Index for event detection date
CREATE INDEX IF NOT EXISTS idx_correlation_detected ON correlation_events(detected_at);

-- Composite index for domain + type
CREATE INDEX IF NOT EXISTS idx_correlation_domain_type ON correlation_events(domain_id, event_type);

-- ============================================================================
-- ANOMALIES TABLE INDEXES
-- ============================================================================

-- Index for domain anomalies
CREATE INDEX IF NOT EXISTS idx_anomalies_domain ON anomalies(domain_id);

-- Index for anomaly severity
CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomalies(severity);

-- Index for anomaly status
CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status);

-- Composite index for domain + status
CREATE INDEX IF NOT EXISTS idx_anomalies_domain_status ON anomalies(domain_id, status);

-- Index for detection date
CREATE INDEX IF NOT EXISTS idx_anomalies_detected ON anomalies(detected_at);

-- ============================================================================
-- PREDICTIONS TABLE INDEXES
-- ============================================================================

-- Index for domain predictions
CREATE INDEX IF NOT EXISTS idx_predictions_domain ON predictions(domain_id);

-- Index for prediction type
CREATE INDEX IF NOT EXISTS idx_predictions_type ON predictions(prediction_type);

-- Index for prediction date
CREATE INDEX IF NOT EXISTS idx_predictions_predicted ON predictions(predicted_at);

-- Composite index for domain + type
CREATE INDEX IF NOT EXISTS idx_predictions_domain_type ON predictions(domain_id, prediction_type);

-- Index for confidence score
CREATE INDEX IF NOT EXISTS idx_predictions_confidence ON predictions(confidence_score);
