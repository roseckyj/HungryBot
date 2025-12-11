import { Iconv } from 'iconv';

export const winToUtf = Iconv('windows-1250', 'utf-8');
