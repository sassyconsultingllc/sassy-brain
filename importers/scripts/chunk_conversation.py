#!/usr/bin/env python3
"""
Conversation Chunker - Splits large conversations into multiple attachment files
NO TRUNCATION - preserves EVERYTHING
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime


class ConversationChunker:
    """Chunks conversations into multiple files without any truncation."""
    
    def __init__(self, chunk_size: int = 50000):
        """
        Args:
            chunk_size: Characters per chunk (default 50k, adjust as needed)
        """
        self.chunk_size = chunk_size
    
    def chunk_conversation(self, messages: List[Dict[str, Any]], metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Split a conversation into chunks. NO TRUNCATION.
        
        Returns list of chunks, each containing:
        - chunk_num: Which chunk this is
        - total_chunks: Total number of chunks
        - messages: Messages in this chunk
        - metadata: Conversation metadata
        """
        if not messages:
            return []
        
        chunks = []
        current_chunk = []
        current_size = 0
        
        for msg in messages:
            msg_text = json.dumps(msg)
            msg_size = len(msg_text)
            
            # If single message exceeds chunk size, include it anyway (no truncation!)
            if msg_size > self.chunk_size and not current_chunk:
                chunks.append([msg])
                continue
            
            # If adding this message would exceed chunk size, start new chunk
            if current_size + msg_size > self.chunk_size and current_chunk:
                chunks.append(current_chunk)
                current_chunk = [msg]
                current_size = msg_size
            else:
                current_chunk.append(msg)
                current_size += msg_size
        
        # Add final chunk
        if current_chunk:
            chunks.append(current_chunk)
        
        # Format chunks with metadata
        total_chunks = len(chunks)
        formatted_chunks = []
        
        for idx, chunk_messages in enumerate(chunks, 1):
            formatted_chunks.append({
                'chunk_num': idx,
                'total_chunks': total_chunks,
                'message_count': len(chunk_messages),
                'messages': chunk_messages,
                'metadata': {
                    **metadata,
                    'chunked': True,
                    'chunk_info': f'Part {idx} of {total_chunks}'
                }
            })
        
        return formatted_chunks
    
    def save_chunks(self, chunks: List[Dict[str, Any]], output_dir: str, base_name: str = 'conversation'):
        """
        Save chunks to separate files.
        
        Args:
            chunks: List of chunk dictionaries
            output_dir: Directory to save chunks
            base_name: Base filename (will add _part1, _part2, etc.)
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        saved_files = []
        
        for chunk in chunks:
            chunk_num = chunk['chunk_num']
            total = chunk['total_chunks']
            
            filename = f"{base_name}_part{chunk_num}of{total}.json"
            filepath = output_path / filename
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(chunk, f, indent=2, ensure_ascii=False)
            
            saved_files.append(str(filepath))
            print(f"Saved {filename}: {chunk['message_count']} messages")
        
        return saved_files
    
    def create_conversation_map(self, chunks: List[Dict[str, Any]], output_dir: str):
        """
        Create a map/index file showing the conversation structure.
        """
        total_messages = sum(chunk['message_count'] for chunk in chunks)
        
        map_data = {
            'conversation_summary': {
                'total_chunks': len(chunks),
                'total_messages': total_messages,
                'created_at': datetime.now().isoformat(),
                'metadata': chunks[0]['metadata'] if chunks else {}
            },
            'chunks': [
                {
                    'chunk_num': chunk['chunk_num'],
                    'message_count': chunk['message_count'],
                    'file': f"conversation_part{chunk['chunk_num']}of{chunk['total_chunks']}.json"
                }
                for chunk in chunks
            ]
        }
        
        map_file = Path(output_dir) / 'conversation_map.json'
        with open(map_file, 'w', encoding='utf-8') as f:
            json.dump(map_data, f, indent=2, ensure_ascii=False)
        
        print(f"\nCreated conversation map: {map_file}")
        print(f"Total: {total_messages} messages across {len(chunks)} chunks")
        
        return str(map_file)


def main():
    """CLI for chunking conversations."""
    import sys
    from parse_chat_history import ChatHistoryParser
    
    if len(sys.argv) < 2:
        print("Usage: chunk_conversation.py <input_file> [output_dir] [chunk_size]")
        print("\nChunks conversation into multiple files - NO TRUNCATION")
        print("All messages are preserved across chunks")
        sys.exit(1)
    
    input_file = Path(sys.argv[1])
    output_dir = sys.argv[2] if len(sys.argv) > 2 else './chunked_conversation'
    chunk_size = int(sys.argv[3]) if len(sys.argv) > 3 else 50000
    
    if not input_file.exists():
        print(f"Error: Input file '{input_file}' not found")
        sys.exit(1)
    
    # Parse the conversation
    print(f"Parsing conversation from {input_file}...")
    content = input_file.read_text(encoding='utf-8')
    parsed = ChatHistoryParser.parse(content)
    
    if parsed['message_count'] == 0:
        print("Error: No messages found in input file")
        sys.exit(1)
    
    print(f"Found {parsed['message_count']} messages")
    
    # Check if chunking is needed
    content_size = len(json.dumps(parsed['messages']))
    print(f"Total size: {content_size:,} characters")
    
    if content_size <= chunk_size:
        print(f"Conversation fits in single chunk (< {chunk_size:,} chars)")
        print("No chunking needed, but creating output anyway...")
    
    # Chunk the conversation
    chunker = ConversationChunker(chunk_size=chunk_size)
    chunks = chunker.chunk_conversation(parsed['messages'], parsed['metadata'])
    
    print(f"\nCreating {len(chunks)} chunks...")
    
    # Save chunks
    saved_files = chunker.save_chunks(chunks, output_dir)
    
    # Create map
    map_file = chunker.create_conversation_map(chunks, output_dir)
    
    print(f"\n✓ Complete! All {parsed['message_count']} messages preserved.")
    print(f"✓ Output directory: {output_dir}")
    print(f"✓ Files created: {len(saved_files) + 1}")


if __name__ == '__main__':
    main()
