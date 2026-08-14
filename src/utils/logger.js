/**
 * سجل مبسّط. المبدأ: لا تُكتب أرقام العملاء أو تفاصيل القضايا كاملة في السجل،
 * فقط ما يكفي للتدقيق ومعرفة أن الاستعلام تم.
 */
const stamp = () => new Date().toISOString();

const write = (level, message, meta) => {
  const suffix = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  console[level === 'error' ? 'error' : 'log'](`[${stamp()}] ${level.toUpperCase()} ${message}${suffix}`);
};

export const logger = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};
