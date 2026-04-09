import sys
import subprocess
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Location of the repository (assumes cloned internally or mounted)
SOLVER_DIR = os.path.join(os.path.dirname(__file__), 'rubiks-cube-NxNxN-solver')

@app.route('/')
def health_check():
    return jsonify({
        'status': 'online',
        'message': '4x4 Solver API is running. Use POST /solve to get solutions.'
    })

@app.route('/solve', methods=['POST'])
def solve_cube():
    data = request.json
    state = data.get('state')
    
    if not state or len(state) != 96:
        return jsonify({'error': 'Invalid state string. 4x4x4 requires 96 characters.'}), 400
        
    try:
        # Run the dwalton solver 
        # Using sys.executable to ensure we use the same Python environment that Flask is running in
        result = subprocess.run(
            [sys.executable, 'rubiks-cube-solver.py', '--state', state],
            cwd=SOLVER_DIR,
            capture_output=True,
            text=True,
            check=True
        )
        
        output = result.stdout
        
        # The Python solver prints the solution at the end, typically something like "Solution: U R2 Fw ..."
        # Let's extract the solution line
        solution_lines = [line for line in output.split('\n') if ':' in line and len(line) > 5]
        
        # Fallback to the raw output if we can't parse neatly
        return jsonify({
            'success': True,
            'solution': output,
            'raw': output
        })
        
    except subprocess.CalledProcessError as e:
        return jsonify({
            'error': 'Solver failed to run.',
            'details': e.stderr or e.stdout
        }), 500
    except Exception as e:
        return jsonify({
            'error': 'Unexpected error occurred.',
            'details': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
