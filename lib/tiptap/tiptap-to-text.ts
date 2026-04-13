export function tiptapToPlainText(json: any): string {
    if (!json || typeof json !== 'object') return '';
    
    let text = '';
    
    if (json.type === 'text') {
        text += json.text || '';
    } else if (json.type === 'mention') {
        text += `@${json.attrs?.label || 'someone'}`;
    }

    if (json.content && Array.isArray(json.content)) {
        json.content.forEach((child: any) => {
            text += tiptapToPlainText(child);
            if (child.type === 'paragraph' || child.type === 'heading') {
                text += '\n';
            }
        });
    }

    return text.trim();
}
