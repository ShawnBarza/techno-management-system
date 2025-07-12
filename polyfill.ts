import { Buffer } from 'buffer';

if (!global.Buffer) global.Buffer = Buffer;
global.Buffer = global.Buffer || require('buffer').Buffer;