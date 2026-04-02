console.log('Xenozoologist Express starting...');

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext('2d')!;
ctx.fillStyle = '#0a0a0f';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#7af5ca';
ctx.font = '24px monospace';
ctx.textAlign = 'center';
ctx.fillText('Xenozoologist Express', canvas.width / 2, canvas.height / 2);
