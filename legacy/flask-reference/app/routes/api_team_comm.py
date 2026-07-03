from flask import Blueprint, request, jsonify, session
from services.team_communication import CommunicationService

bp = Blueprint('api_team_comm', __name__, url_prefix='/api/v1/team_comm')

@bp.route('/<entity_type>/<int:entity_id>/messages', methods=['GET'])
def get_messages(entity_type, entity_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    try:
        messages = CommunicationService.get_thread_messages(
            session['company_id'], 
            entity_type, 
            entity_id, 
            session['user_id']
        )
        return jsonify({"status": "success", "messages": messages})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@bp.route('/<entity_type>/<int:entity_id>/messages', methods=['POST'])
def post_message(entity_type, entity_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json
    body = data.get('body')
    request_exclusion = data.get('request_exclusion', False)
    exclusion_reason = data.get('exclusion_reason')
    
    if not body:
        return jsonify({"error": "Message body is required."}), 400
        
    try:
        msg_id, message_data = CommunicationService.post_internal_message(
            company_id=session['company_id'],
            author_id=session['user_id'],
            body=body,
            entity_type=entity_type,
            entity_id=entity_id,
            request_exclusion=request_exclusion,
            exclusion_reason=exclusion_reason,
            return_payload=True # We will update the service to return this
        )
        
        # Emit WebSocket event
        from flask import current_app
        try:
            # We access the configured socketio instance from the app
            socketio = current_app.extensions['socketio']
            socketio.emit(f"new_message_{session['company_id']}_{entity_type}_{entity_id}", message_data)
        except Exception as ws_e:
            current_app.logger.warning(f"Failed to emit websocket event: {ws_e}")
            
        return jsonify({"status": "success", "message_id": msg_id})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@bp.route('/alerts/count', methods=['GET'])
def get_alert_count():
    if 'user_id' not in session:
        return jsonify({"count": 0}), 401
    count = CommunicationService.get_unread_alerts_count(session['user_id'])
    return jsonify({"count": count})
