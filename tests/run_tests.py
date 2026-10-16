"""
Standalone Test Runner for Kestrel AI.
Executes all unit and integration tests, printing detailed results.
"""
import sys
import os

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from tests.test_kestrel_core import (
    test_health_check,
    test_python_sqli_detection,
    test_python_command_injection_detection,
    test_secrets_detection_and_redaction,
    test_dockerfile_root_user,
    test_yara_short_string_and_missing_condition,
    test_sigma_rule_validation,
    test_snort_rule_missing_sid,
    test_orchestrator_routing,
    test_terminal_help_command,
    test_terminal_status_command,
    test_terminal_ls_command,
    test_terminal_cve_query,
    test_terminal_unknown_command_safeguard,
    test_file_size_limit,
    test_workspace_tree_endpoint,
    test_workspace_file_read_write,
    test_workspace_path_traversal_guard,
    test_batch_workspace_scan,
    test_sarif_export,
    test_sqlite_cache_persistence,
    test_git_status_endpoint,
    test_git_stage_and_unstage,
    test_project_search_endpoint,
    test_project_search_regex,
    test_settings_get_and_save,
    test_terminal_real_shell_execution,
    test_oauth_providers_and_csrf_state,
    test_auth_password_hashing,
    test_auth_registration_and_login_flow,
    test_sandbox_simulation,
    test_threat_model_graph,
    test_cicd_pipeline_generator,
    test_ollama_settings_and_offline_routing,
    test_ask_ai_vulnerability_and_guardrails,
    test_simulator_scenarios_catalog,
    test_simulator_command_injection_detection,
    test_simulator_defended_code_validation,
    test_extension_marketplace_endpoints
)

tests = [
    ("Health Check", test_health_check),
    ("Python SQLi Detection (AST)", test_python_sqli_detection),
    ("Python Command Injection Detection (AST)", test_python_command_injection_detection),
    ("Secret Detection & Redaction", test_secrets_detection_and_redaction),
    ("Dockerfile Security (Root User)", test_dockerfile_root_user),
    ("YARA Linter (Short Strings / Conditions)", test_yara_short_string_and_missing_condition),
    ("Sigma SIEM Rule Validator", test_sigma_rule_validation),
    ("Snort IDS Rule Linter", test_snort_rule_missing_sid),
    ("Orchestrator Routing", test_orchestrator_routing),
    ("Terminal Help Command", test_terminal_help_command),
    ("Terminal Status Command", test_terminal_status_command),
    ("Terminal LS Command", test_terminal_ls_command),
    ("Terminal CVE Query", test_terminal_cve_query),
    ("Terminal Command Safeguard", test_terminal_unknown_command_safeguard),
    ("File Size Limit (>500KB)", test_file_size_limit),
    ("Workspace Disk Tree Discovery", test_workspace_tree_endpoint),
    ("Workspace File Read & Write I/O", test_workspace_file_read_write),
    ("Workspace Directory Traversal Guard", test_workspace_path_traversal_guard),
    ("Whole-Repository Batch Audit", test_batch_workspace_scan),
    ("OASIS SARIF 2.1.0 Exporter", test_sarif_export),
    ("SQLite AST Cache Persistence", test_sqlite_cache_persistence),
    ("Git Source Control Status", test_git_status_endpoint),
    ("Git Stage & Unstage Files", test_git_stage_and_unstage),
    ("Project-Wide Global Search", test_project_search_endpoint),
    ("Project Search Regex Matching", test_project_search_regex),
    ("Studio Settings Configuration", test_settings_get_and_save),
    ("Real Shell Terminal Execution", test_terminal_real_shell_execution),
    ("OAuth Providers & CSRF Flow", test_oauth_providers_and_csrf_state),
    ("PBKDF2 Password Hashing & Verification", test_auth_password_hashing),
    ("User Registration & Credential Login", test_auth_registration_and_login_flow),
    ("Docker Exploit Sandbox Simulation", test_sandbox_simulation),
    ("Interactive Threat Model & Attack Tree", test_threat_model_graph),
    ("Automated CI/CD Pipeline Generator", test_cicd_pipeline_generator),
    ("Ollama Offline LLM Routing", test_ollama_settings_and_offline_routing),
    ("Ask AI Vulnerability Specialist (Guardrails)", test_ask_ai_vulnerability_and_guardrails),
    ("Attack Simulator Scenarios Catalog", test_simulator_scenarios_catalog),
    ("Attack Simulator Command Injection Execution", test_simulator_command_injection_detection),
    ("Attack Simulator Defended Code Validation", test_simulator_defended_code_validation),
    ("Extension Marketplace Lifecycle", test_extension_marketplace_endpoints),
]

def main():
    print("=" * 60)
    print("Kestrel AI - Automated Security & Functionality Test Suite")
    print("Hunt flaws. Ship armor.")
    print("=" * 60)
    passed = 0
    failed = 0

    for name, test_func in tests:
        try:
            test_func()
            print(f"[PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"[FAIL] {name}: {e}")
            failed += 1

    print("=" * 60)
    print(f"Total Tests: {len(tests)} | Passed: {passed} | Failed: {failed}")
    print("=" * 60)
    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
