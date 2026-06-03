from datetime import datetime
import traceback
import os
import json

class ErrorReporter:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.success_steps = []
        self.final_result = False
        
    def add_error(self, step, message, exception=None):
        error_data = {
            'step': step,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'type': 'error'
        }
        if exception:
            error_data['exception'] = str(exception)
            error_data['traceback'] = traceback.format_exc()
            
            # エラーが発生したファイル名を取得
            tb = traceback.extract_tb(exception.__traceback__)
            if tb:
                # 最後のフレーム（実際にエラーが発生した場所）を取得
                last_frame = tb[-1]
                error_data['error_file'] = os.path.basename(last_frame.filename)
                error_data['error_line'] = last_frame.lineno
                error_data['error_function'] = last_frame.name
        self.errors.append(error_data)
        
    def add_warning(self, step, message):
        warning_data = {
            'step': step,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'type': 'warning'
        }
        self.warnings.append(warning_data)
        
    def add_success(self, step, message):
        success_data = {
            'step': step,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'type': 'success'
        }
        self.success_steps.append(success_data)
        
    def set_final_result(self, success):
        self.final_result = success
        
    def output_json_report(self):
        """JSON形式でレポートを出力"""
        report = {
            'final_result': self.final_result,
            'timestamp': datetime.now().isoformat(),
            'errors': self.errors,
            'warnings': self.warnings,
            'success_steps': self.success_steps,
            'summary': {
                'total_errors': len(self.errors),
                'total_warnings': len(self.warnings),
                'total_success_steps': len(self.success_steps)
            }
        }
        
        print("=== JSON_REPORT_START ===")
        print(json.dumps(report, ensure_ascii=False, indent=2))
        print("=== JSON_REPORT_END ===") 