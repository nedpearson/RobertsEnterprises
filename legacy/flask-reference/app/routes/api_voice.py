from flask import Blueprint, request, jsonify, session
from services.ai_orchestrator import AIOperationalOrchestrator

bp = Blueprint('api_voice', __name__, url_prefix='/api/voice')

@bp.route('/process', methods=['POST'])
def process_voice():
    """
    Stage 1: Listen to voice and return an interpretation.
    """
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json
    transcript = data.get('transcript', '')
    context = data.get('page_context', {})
    
    if not transcript:
        return jsonify({"error": "Empty transcript"}), 400
        
    orchestrator = AIOperationalOrchestrator()
    plan = orchestrator.process_voice_command(
        session['company_id'], 
        session['user_id'], 
        context, 
        transcript
    )
    
    return jsonify(plan)

@bp.route('/execute', methods=['POST'])
def execute_voice_plan():
    """
    Stage 2: Execute the confirmed action plan.
    """
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    action_plan = request.json.get('action_plan')
    
    if not action_plan:
        return jsonify({"error": "Missing action plan"}), 400
        
    orchestrator = AIOperationalOrchestrator()
    result = orchestrator.execute_action_plan(
        session['company_id'],
        session['user_id'],
        action_plan
    )
    
    return jsonify(result)
