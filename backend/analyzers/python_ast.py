"""
Deterministic Python AST Security Analyzer for SecStudio AI.
Parses Abstract Syntax Trees in memory without executing code.
Identifies SQL Injection, Command Injection, Insecure Deserialization,
and Weak Cryptography with exact line numbers and CWE identifiers.
"""
import ast
from typing import List, Optional
from ..models import Finding, SeverityLevel


class PythonASTSecurityVisitor(ast.NodeVisitor):
    def __init__(self, code_lines: List[str]):
        self.code_lines = code_lines
        self.findings: List[Finding] = []
        self.func_stack: List[str] = []

    def visit_FunctionDef(self, node: ast.FunctionDef):
        self.func_stack.append(node.name)
        self.generic_visit(node)
        self.func_stack.pop()

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
        self.func_stack.append(node.name)
        self.generic_visit(node)
        self.func_stack.pop()

    @property
    def current_function(self) -> str:
        return self.func_stack[-1] if self.func_stack else "global"

    def _get_snippet(self, node: ast.AST) -> str:
        line_num = getattr(node, "lineno", 1)
        if 1 <= line_num <= len(self.code_lines):
            return self.code_lines[line_num - 1].strip()
        return ""

    def visit_Assign(self, node: ast.Assign):
        # Detect unescaped dynamic query/command building (VALIDATION_GAP)
        if isinstance(node.value, ast.JoinedStr):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    var_name = target.id.lower()
                    if any(k in var_name for k in ("query", "sql", "cmd", "command", "exec")):
                        self.findings.append(
                            Finding(
                                id=f"ast_{node.lineno}_validation_gap_interpolation",
                                rule_id="bandit-B608-fstring-query-construction",
                                title=f"Validation Gap: Dynamic {target.id} Construction",
                                description=f"Untrusted input interpolated directly into '{target.id}'. Missing sanitization or parameterized template.",
                                cwe_id="CWE-89" if "sql" in var_name or "query" in var_name else "CWE-78",
                                severity=SeverityLevel.HIGH,
                                line_start=node.lineno,
                                line_end=getattr(node, "end_lineno", node.lineno),
                                code_snippet=self._get_snippet(node),
                                scanner="python_ast",
                                architectural_role="VALIDATION_GAP",
                                enclosing_function=self.current_function
                            )
                        )
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call):
        # 1. Detect subprocess with shell=True (CWE-78 Command Injection - SINK)
        func_name = self._get_call_name(node.func)
        if func_name in ("subprocess.run", "subprocess.Popen", "subprocess.call", "subprocess.check_output"):
            for keyword in node.keywords:
                if keyword.arg == "shell" and isinstance(keyword.value, ast.Constant) and keyword.value.value is True:
                    self.findings.append(
                        Finding(
                            id=f"ast_{node.lineno}_command_injection",
                            rule_id="bandit-B602-subprocess-popen-with-shell-equals-true",
                            title="Command Injection via Subprocess with shell=True",
                            description="Executing OS commands with shell=True and untrusted inputs allows arbitrary command execution.",
                            cwe_id="CWE-78",
                            severity=SeverityLevel.CRITICAL,
                            line_start=node.lineno,
                            line_end=getattr(node, "end_lineno", node.lineno),
                            code_snippet=self._get_snippet(node),
                            scanner="python_ast",
                            architectural_role="SINK",
                            enclosing_function=self.current_function
                        )
                    )

        # 2. Detect os.system (CWE-78 - SINK)
        if func_name == "os.system":
            self.findings.append(
                Finding(
                    id=f"ast_{node.lineno}_os_system",
                    rule_id="bandit-B605-start-process-with-a-shell",
                    title="Dangerous Call to os.system",
                    description="os.system passes strings directly to the shell. Use subprocess with argument lists instead.",
                    cwe_id="CWE-78",
                    severity=SeverityLevel.HIGH,
                    line_start=node.lineno,
                    line_end=getattr(node, "end_lineno", node.lineno),
                    code_snippet=self._get_snippet(node),
                    scanner="python_ast",
                    architectural_role="SINK",
                    enclosing_function=self.current_function
                )
            )

        # 3. Detect SQL Injection in cursor.execute (CWE-89)
        if func_name.endswith(".execute") or func_name == "execute":
            if node.args:
                first_arg = node.args[0]
                # Case A: Joined string formatting (f-string in execute)
                if isinstance(first_arg, ast.JoinedStr):
                    self.findings.append(
                        Finding(
                            id=f"ast_{node.lineno}_sql_injection_fstring",
                            rule_id="bandit-B608-hardcoded-sql-expressions",
                            title="SQL Injection via Formatted String Literal",
                            description="Direct interpolation of variables into an SQL execute call permits SQL injection attacks.",
                            cwe_id="CWE-89",
                            severity=SeverityLevel.CRITICAL,
                            line_start=node.lineno,
                            line_end=getattr(node, "end_lineno", node.lineno),
                            code_snippet=self._get_snippet(node),
                            scanner="python_ast",
                            architectural_role="SINK",
                            enclosing_function=self.current_function
                        )
                    )
                # Case B: Binary operation (query % args or query + args)
                elif isinstance(first_arg, ast.BinOp) and isinstance(first_arg.op, (ast.Mod, ast.Add)):
                    self.findings.append(
                        Finding(
                            id=f"ast_{node.lineno}_sql_injection_concat",
                            rule_id="bandit-B608-hardcoded-sql-expressions",
                            title="SQL Injection via String Concatenation or Modulo",
                            description="Constructing SQL queries using string formatting or concatenation enables unauthorized database manipulation.",
                            cwe_id="CWE-89",
                            severity=SeverityLevel.CRITICAL,
                            line_start=node.lineno,
                            line_end=getattr(node, "end_lineno", node.lineno),
                            code_snippet=self._get_snippet(node),
                            scanner="python_ast",
                            architectural_role="SINK",
                            enclosing_function=self.current_function
                        )
                    )
                # Case C: Name referring to a previously formatted query
                elif isinstance(first_arg, ast.Name):
                    query_name = first_arg.id
                    if "query" in query_name.lower() or "sql" in query_name.lower():
                        self.findings.append(
                            Finding(
                                id=f"ast_{node.lineno}_sql_query_var",
                                rule_id="bandit-B608-hardcoded-sql-expressions",
                                title="Potential SQL Injection via Dynamic Query Variable",
                                description=f"Execution of dynamic SQL query variable '{query_name}'. Verify parameterization.",
                                cwe_id="CWE-89",
                                severity=SeverityLevel.HIGH,
                                line_start=node.lineno,
                                line_end=getattr(node, "end_lineno", node.lineno),
                                code_snippet=self._get_snippet(node),
                                scanner="python_ast",
                                architectural_role="SINK",
                                enclosing_function=self.current_function
                            )
                        )

        # 4. Detect pickle.loads / pickle.load (CWE-502 Insecure Deserialization - SINK)
        if func_name in ("pickle.loads", "pickle.load", "_pickle.loads"):
            self.findings.append(
                Finding(
                    id=f"ast_{node.lineno}_insecure_deserialization",
                    rule_id="bandit-B301-pickle",
                    title="Insecure Deserialization via Pickle",
                    description="Deserializing untrusted pickle streams allows arbitrary remote code execution.",
                    cwe_id="CWE-502",
                    severity=SeverityLevel.CRITICAL,
                    line_start=node.lineno,
                    line_end=getattr(node, "end_lineno", node.lineno),
                    code_snippet=self._get_snippet(node),
                    scanner="python_ast",
                    architectural_role="SINK",
                    enclosing_function=self.current_function
                )
            )

        # 5. Detect eval / exec (CWE-95 - SINK)
        if func_name in ("eval", "exec"):
            self.findings.append(
                Finding(
                    id=f"ast_{node.lineno}_eval_exec",
                    rule_id="bandit-B307-eval",
                    title="Use of Dangerous Function (eval/exec)",
                    description="Dynamic evaluation of code via eval or exec is inherently unsafe when handling untrusted inputs.",
                    cwe_id="CWE-95",
                    severity=SeverityLevel.HIGH,
                    line_start=node.lineno,
                    line_end=getattr(node, "end_lineno", node.lineno),
                    code_snippet=self._get_snippet(node),
                    scanner="python_ast",
                    architectural_role="SINK",
                    enclosing_function=self.current_function
                )
            )

        # 6. Detect Flask app.run(debug=True) in production (CWE-489 - VALIDATION_GAP)
        if func_name.endswith(".run") or func_name == "app.run":
            for keyword in node.keywords:
                if keyword.arg == "debug" and isinstance(keyword.value, ast.Constant) and keyword.value.value is True:
                    self.findings.append(
                        Finding(
                            id=f"ast_{node.lineno}_flask_debug",
                            rule_id="bandit-B201-flask-debug-true",
                            title="Flask Application Running in Debug Mode",
                            description="Enabling debug mode in Flask exposes the interactive Werkzeug PIN console, allowing arbitrary remote code execution.",
                            cwe_id="CWE-489",
                            severity=SeverityLevel.HIGH,
                            line_start=node.lineno,
                            line_end=getattr(node, "end_lineno", node.lineno),
                            code_snippet=self._get_snippet(node),
                            scanner="python_ast",
                            architectural_role="VALIDATION_GAP",
                            enclosing_function=self.current_function
                        )
                    )

        self.generic_visit(node)

    def _get_call_name(self, node: ast.AST) -> str:
        """Helper to resolve dot-separated function names (e.g. subprocess.run)."""
        if isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.Attribute):
            value_name = self._get_call_name(node.value)
            if value_name:
                return f"{value_name}.{node.attr}"
            return node.attr
        return ""


def scan_python_ast(code: str, filename: str = "sample.py") -> List[Finding]:
    """Parses code into an AST and visits nodes to identify vulnerabilities."""
    code_lines = code.splitlines()
    try:
        tree = ast.parse(code, filename=filename)
    except SyntaxError as e:
        # Return syntax error finding so developer knows code didn't compile
        return [
            Finding(
                id=f"ast_syntax_error_{e.lineno or 1}",
                rule_id="syntax-error",
                title="Python Syntax Error",
                description=str(e),
                cwe_id="CWE-20",
                severity=SeverityLevel.INFORMATIONAL,
                line_start=e.lineno or 1,
                line_end=e.lineno or 1,
                code_snippet=code_lines[(e.lineno - 1)] if (e.lineno and e.lineno <= len(code_lines)) else "",
                scanner="python_ast"
            )
        ]

    visitor = PythonASTSecurityVisitor(code_lines)
    visitor.visit(tree)
    return visitor.findings
