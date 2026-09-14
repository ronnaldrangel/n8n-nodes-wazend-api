import { cpSync, mkdirSync } from 'node:fs';
mkdirSync('dist/nodes/Wazend', { recursive: true });
cpSync('nodes/Wazend/wazend.svg', 'dist/nodes/Wazend/wazend.svg');
