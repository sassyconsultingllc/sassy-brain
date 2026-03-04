#!/usr/bin/env python3
"""
Chat History Parser
Parses chat histories from various AI systems into a standardized format.
"""

import json
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path


class ChatMessage:
    """Represents a single message in a conversation."""
    
    def __init__(self, role: str, content: str, timestamp: Optional[str] = None):
        self.role = role  # 'user' or 'assistant'
        self.content = content
        self.timestamp = timestamp or datetime.now().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'role': self.role,
            'content': self.content,
            'timestamp': self.timestamp
        }


class ChatHistoryParser:
    """Parser for different chat history formats."""
    
    @staticmethod
    def detect_format(content: str) -> str:
        """Detect the format of the chat history."""
        # Try JSON first
        try:
            data = json.loads(content)
            if 'mapping' in data:
                return 'chatgpt_json'
            elif 'contents' in data:
                return 'gemini_json'
            elif 'platform' in data and data.get('platform') == 'x.ai':
                return 'grok_json'
            elif 'session_id' in data and 'manus' in data.get('session_id', ''):
                return 'manus_json'
            elif 'automation_type' in data or 'session_type' in data:
                return 'manus_json'
            elif 'conversation' in data or 'messages' in data:
                return 'generic_json'
        except json.JSONDecodeError:
            pass
        
        # Check for Manus session logs
        if '[Manus Session' in content or 'Manus:' in content:
            return 'manus_text'
        
        # Check for Grok specific markers
        if 'Grok:' in content or '@grok' in content.lower():
            return 'grok_text'
        
        # Check for markdown patterns
        if re.search(r'\*\*Question\*\*:|\*\*Answer\*\*:', content):
            return 'perplexity_markdown'
        
        # Check for simple alternating format
        if re.search(r'\[(User|AI Assistant)', content):
            return 'timestamped_alternating'
        
        # Check for YAML frontmatter
        if content.strip().startswith('---'):
            return 'yaml_frontmatter'
        
        # Default to generic alternating
        return 'generic_alternating'
    
    @staticmethod
    def parse_chatgpt_json(content: str) -> List[ChatMessage]:
        """Parse ChatGPT JSON export format."""
        data = json.loads(content)
        messages = []
        
        if 'mapping' in data:
            # Native ChatGPT export format
            for msg_id, msg_data in data['mapping'].items():
                if 'message' in msg_data and msg_data['message']:
                    msg = msg_data['message']
                    role = msg.get('role', 'user')
                    content_data = msg.get('content', {})
                    
                    if isinstance(content_data, dict):
                        parts = content_data.get('parts', [])
                        content = ' '.join(parts) if parts else ''
                    else:
                        content = str(content_data)
                    
                    if content:
                        messages.append(ChatMessage(
                            role='user' if role == 'user' else 'assistant',
                            content=content
                        ))
        elif 'messages' in data:
            # Simplified format
            for msg in data['messages']:
                messages.append(ChatMessage(
                    role=msg.get('role', 'user'),
                    content=msg.get('content', '')
                ))
        
        return messages
    
    @staticmethod
    def parse_gemini_json(content: str) -> List[ChatMessage]:
        """Parse Gemini JSON export format."""
        data = json.loads(content)
        messages = []
        
        for item in data.get('contents', []):
            role = 'user' if item.get('role') == 'user' else 'assistant'
            parts = item.get('parts', [])
            content = ' '.join(part.get('text', '') for part in parts)
            
            if content:
                messages.append(ChatMessage(role=role, content=content))
        
        return messages
    
    @staticmethod
    def parse_generic_json(content: str) -> List[ChatMessage]:
        """Parse generic JSON format."""
        data = json.loads(content)
        messages = []
        
        # Try different possible keys
        msg_list = data.get('conversation') or data.get('messages') or []
        
        for msg in msg_list:
            role = msg.get('role') or msg.get('speaker') or 'user'
            content = msg.get('content') or msg.get('text') or ''
            timestamp = msg.get('timestamp') or msg.get('time')
            
            # Normalize role
            if role in ['model', 'assistant', 'ai', 'bot']:
                role = 'assistant'
            else:
                role = 'user'
            
            messages.append(ChatMessage(role=role, content=content, timestamp=timestamp))
        
        return messages
    
    @staticmethod
    def parse_grok_json(content: str) -> List[ChatMessage]:
        """Parse Grok JSON format."""
        data = json.loads(content)
        messages = []
        
        for msg in data.get('messages', []):
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            timestamp = msg.get('timestamp')
            
            # Normalize role
            if role == 'assistant':
                role = 'assistant'
            else:
                role = 'user'
            
            if content:
                messages.append(ChatMessage(role=role, content=content, timestamp=timestamp))
        
        return messages
    
    @staticmethod
    def parse_manus_json(content: str) -> List[ChatMessage]:
        """Parse Manus session log JSON format."""
        data = json.loads(content)
        messages = []
        
        for item in data.get('conversation', []):
            msg_type = item.get('type', '')
            timestamp = item.get('timestamp')
            
            if msg_type == 'user_command':
                messages.append(ChatMessage(
                    role='user',
                    content=item.get('content', ''),
                    timestamp=timestamp
                ))
            elif msg_type in ['manus_action', 'manus_response']:
                # Format Manus actions as assistant responses
                if msg_type == 'manus_action':
                    action = item.get('action', '')
                    status = item.get('status', '')
                    content = f"Action: {action}"
                    
                    # Add relevant details
                    if 'url' in item:
                        content += f" → {item['url']}"
                    elif 'selector' in item:
                        content += f" → {item['selector']}"
                        if 'text' in item:
                            content += f": {item['text']}"
                    
                    content += f"\nStatus: {status}"
                else:
                    # manus_response
                    data_content = item.get('data', {})
                    content = f"Response: {json.dumps(data_content, indent=2)}"
                
                messages.append(ChatMessage(
                    role='assistant',
                    content=content,
                    timestamp=timestamp
                ))
        
        return messages
    
    @staticmethod
    def parse_alternating_text(content: str) -> List[ChatMessage]:
        """Parse simple alternating text format."""
        messages = []
        lines = content.strip().split('\n')
        
        current_role = None
        current_content = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Detect role markers
            user_markers = ['user:', 'you:', 'human:', 'me:', '[user', 'user -', '> user']
            ai_markers = ['assistant:', 'ai:', 'bot:', 'gemini:', 'chatgpt:', 'claude:', 'grok:', 'manus:', '[ai', 'assistant -', '> manus', '> grok']
            
            line_lower = line.lower()
            
            is_user = any(line_lower.startswith(marker) for marker in user_markers)
            is_ai = any(line_lower.startswith(marker) for marker in ai_markers)
            
            if is_user or is_ai:
                # Save previous message
                if current_role and current_content:
                    messages.append(ChatMessage(
                        role=current_role,
                        content=' '.join(current_content)
                    ))
                    current_content = []
                
                # Start new message
                current_role = 'user' if is_user else 'assistant'
                
                # Remove the role marker from content
                for marker in (user_markers if is_user else ai_markers):
                    if line_lower.startswith(marker):
                        line = line[len(marker):].strip()
                        # Remove timestamp if present
                        line = re.sub(r'^\[?\d{4}-\d{2}-\d{2}[^\]]*\]?', '', line).strip()
                        break
                
                if line:
                    current_content.append(line)
            else:
                # Continue current message
                current_content.append(line)
        
        # Save last message
        if current_role and current_content:
            messages.append(ChatMessage(
                role=current_role,
                content=' '.join(current_content)
            ))
        
        return messages
    
    @staticmethod
    def parse(content: str) -> Dict[str, Any]:
        """Parse chat history and return standardized format."""
        format_type = ChatHistoryParser.detect_format(content)
        
        messages = []
        metadata = {'format': format_type, 'parsed_at': datetime.now().isoformat()}
        
        try:
            if format_type == 'chatgpt_json':
                messages = ChatHistoryParser.parse_chatgpt_json(content)
            elif format_type == 'gemini_json':
                messages = ChatHistoryParser.parse_gemini_json(content)
            elif format_type == 'grok_json':
                messages = ChatHistoryParser.parse_grok_json(content)
            elif format_type == 'manus_json':
                messages = ChatHistoryParser.parse_manus_json(content)
            elif format_type == 'generic_json':
                messages = ChatHistoryParser.parse_generic_json(content)
            else:
                messages = ChatHistoryParser.parse_alternating_text(content)
        except Exception as e:
            metadata['error'] = str(e)
            metadata['fallback'] = True
            # Try generic alternating as fallback
            try:
                messages = ChatHistoryParser.parse_alternating_text(content)
            except:
                pass
        
        return {
            'metadata': metadata,
            'messages': [msg.to_dict() for msg in messages],
            'message_count': len(messages)
        }


def main():
    """CLI interface for the parser."""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: parse_chat_history.py <input_file> [output_file]")
        print("If output_file is not specified, prints to stdout")
        sys.exit(1)
    
    input_file = Path(sys.argv[1])
    output_file = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    
    if not input_file.exists():
        print(f"Error: Input file '{input_file}' not found")
        sys.exit(1)
    
    content = input_file.read_text(encoding='utf-8')
    result = ChatHistoryParser.parse(content)
    
    output_json = json.dumps(result, indent=2, ensure_ascii=False)
    
    if output_file:
        output_file.write_text(output_json, encoding='utf-8')
        print(f"Parsed {result['message_count']} messages")
        print(f"Output written to: {output_file}")
    else:
        print(output_json)


if __name__ == '__main__':
    main()
