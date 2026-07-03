import datetime
from database import get_db

class CommunicationService:
    @staticmethod
    def get_super_admins(company_id):
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT id, email FROM users WHERE company_id = %s AND role = 'Owner' AND active = TRUE", (company_id,))
        return cursor.fetchall()

    @staticmethod
    def _resolve_thread(company_id, entity_type, entity_id):
        db = get_db()
        cursor = db.cursor()
        
        # Check if an open thread exists for this exact context
        query = f"SELECT id FROM internal_threads WHERE company_id = %s AND {entity_type}_id = %s"
        cursor.execute(query, (company_id, entity_id))
        row = cursor.fetchone()
        
        if row:
            return row['id']
            
        # Create new thread
        insert_cols = ['company_id', f"{entity_type}_id"]
        val_placeholders = ["%s", "%s"]
        insert_vals = [company_id, entity_id]
        
        cursor.execute(
            f"INSERT INTO internal_threads ({', '.join(insert_cols)}) VALUES ({', '.join(val_placeholders)}) RETURNING id",
            tuple(insert_vals)
        )
        new_thread = cursor.fetchone()
        return new_thread['id']

    @staticmethod
    def determine_involved_users(company_id, thread_id, author_id, additional_recipients=None):
        involved = set([author_id])
        if additional_recipients:
            involved.update(additional_recipients)
            
        db = get_db()
        cursor = db.cursor()
        
        # Find who else posted in this thread
        cursor.execute("SELECT author_id FROM internal_messages WHERE thread_id = %s", (thread_id,))
        for r in cursor.fetchall():
            involved.add(r['author_id'])
            
        # Add Super Admins (Mandatory inclusion)
        for admin in CommunicationService.get_super_admins(company_id):
            involved.add(admin['id'])
            
        return involved

    @staticmethod
    def post_internal_message(company_id, author_id, body, entity_type, entity_id, 
                            transcript_source=None, request_exclusion=False, exclusion_reason=None, return_payload=False):
        db = get_db()
        cursor = db.cursor()
        
        # Determine Thread
        valid_types = ['customer', 'order', 'appointment', 'po']
        if entity_type not in valid_types:
            raise ValueError(f"Invalid target entity_type: {entity_type}")
            
        thread_id = CommunicationService._resolve_thread(company_id, entity_type, entity_id)
        
        # Handle Super Admin Exclusion Policy
        # Only 'Owner' can exclude other Owners.
        cursor.execute("SELECT role FROM users WHERE id = %s", (author_id,))
        user_role = cursor.fetchone()['role']
        
        exclusion_approved = False
        super_admin_excluded = False
        
        if request_exclusion:
            if user_role == 'Owner':
                super_admin_excluded = True
                exclusion_approved = True
            else:
                # Silently fail the exclusion to ensure inclusion policy holds, but log it
                super_admin_excluded = False
                exclusion_approved = False
                exclusion_reason = "Denied: Insufficient permissions to exclude Super Admin."

        # Insert Message
        cursor.execute('''
            INSERT INTO internal_messages 
            (thread_id, author_id, body, transcript_source, super_admin_excluded, exclusion_reason, exclusion_approved)
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id
        ''', (thread_id, author_id, body, transcript_source, super_admin_excluded, exclusion_reason, exclusion_approved))
        
        message_id = cursor.fetchone()['id']
        
        # Resolve involved users
        involved_user_ids = CommunicationService.determine_involved_users(company_id, thread_id, author_id)
        
        # Remove super admins if exclusion was approved
        if super_admin_excluded and exclusion_approved:
            admin_ids = [a['id'] for a in CommunicationService.get_super_admins(company_id)]
            involved_user_ids = [uid for uid in involved_user_ids if uid not in admin_ids or uid == author_id]

        # Insert Alerts for everyone involved (except author, optionally, but for audit let's include author as 'read')
        for uid in involved_user_ids:
            read_state = (uid == author_id)
            cursor.execute('''
                INSERT INTO internal_alerts (message_id, user_id, read_state)
                VALUES (%s, %s, %s)
            ''', (message_id, uid, read_state))
            
        db.commit()
        
        if return_payload:
            cursor.execute("SELECT first_name, last_name, role FROM users WHERE id = %s", (author_id,))
            author_info = cursor.fetchone()
            
            payload = {
                "id": message_id,
                "first_name": author_info['first_name'],
                "last_name": author_info['last_name'],
                "role": author_info['role'],
                "body": body,
                "transcript_source": transcript_source,
                "created_at": datetime.datetime.now().isoformat()
            }
            return message_id, payload
            
        return message_id

    @staticmethod
    def get_thread_messages(company_id, entity_type, entity_id, requesting_user_id):
        # Fetch notes tied to an entity
        db = get_db()
        cursor = db.cursor()
        
        thread_id = CommunicationService._resolve_thread(company_id, entity_type, entity_id)
        if not thread_id:
            return []
            
        cursor.execute('''
            SELECT m.id, m.body, m.transcript_source, m.created_at, u.first_name, u.last_name, u.role
            FROM internal_messages m
            JOIN users u ON m.author_id = u.id
            WHERE m.thread_id = %s
            ORDER BY m.created_at ASC
        ''', (thread_id,))
        messages = cursor.fetchall()
        
        # Mark alerts as read for requesting user
        if messages:
            msg_ids = tuple([m['id'] for m in messages])
            cursor.execute('''
                UPDATE internal_alerts 
                SET read_state = TRUE 
                WHERE user_id = %s AND message_id IN %s
            ''', (requesting_user_id, msg_ids))
            db.commit()
            
        return messages

    @staticmethod
    def get_unread_alerts_count(user_id):
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT count(id) as c FROM internal_alerts WHERE user_id = %s AND read_state = FALSE", (user_id,))
        return cursor.fetchone()['c']
