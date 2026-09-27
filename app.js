const status = document.getElementById('status');
const content = document.getElementById('content');
const groupsNode = document.getElementById('groups');
const countNode = document.getElementById('count');
const search = document.getElementById('search');

function decodeBase64Url(value) {
  const encoded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '='));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function render(groups, query = '') {
  groupsNode.replaceChildren();
  let total = 0;
  const term = query.trim().toLocaleLowerCase('zh-CN');
  for (const group of groups) {
    const filtered = group.items.filter(item => [group.school, item[0], item[1], item[2]].join(' ').toLocaleLowerCase('zh-CN').includes(term));
    if (!filtered.length) continue;
    total += filtered.length;
    const details = element('details', 'school');
    details.open = term.length > 0 || group.school === '龙谷大学';
    const summary = element('summary');
    const title = element('div');
    title.append(element('h2', '', group.school), element('div', 'sub', `${group.target} · ${filtered.length} 项材料`));
    summary.append(title);
    details.append(summary);
    const body = element('div', 'body');
    body.append(element('div', 'deadline', `${group.route}｜${group.deadline}`));
    if (group.school === '关西学院大学') body.append(element('span', 'pill archive', '已结束 · 仅供留档'));
    const list = element('ol', 'materials');
    for (const [name, description, requirement] of filtered) {
      const row = element('li');
      const head = element('div', 'item-head');
      head.append(element('strong', '', name), element('span', `pill ${requirement.includes('按情况') ? 'conditional' : ''}`, requirement));
      row.append(head, element('p', '', description));
      list.append(row);
    }
    body.append(list);
    if (group.source.startsWith('https://')) {
      const link = element('a', 'source', '查看校方原始资料 ↗');
      link.href = group.source;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      body.append(link);
    }
    details.append(body);
    groupsNode.append(details);
  }
  countNode.textContent = term ? `找到 ${total} 项材料` : `共 ${groups.length} 所大学、${total} 项材料；点击学校名称展开。`;
  if (!total) groupsNode.append(element('p', '', '没有找到相应材料。换个关键词试试。'));
}

async function start() {
  try {
    const rawKey = new URLSearchParams(location.hash.slice(1)).get('k');
    if (!rawKey) throw new Error('链接不完整，请让卉卉重新发送完整链接。');
    const keyBytes = decodeBase64Url(rawKey);
    if (keyBytes.length !== 32) throw new Error('链接不完整，请让卉卉重新发送完整链接。');
    const response = await fetch('./data.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('暂时无法读取清单，请稍后再试。');
    const payload = await response.json();
    const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
    const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decodeBase64Url(payload.iv) }, key, decodeBase64Url(payload.ciphertext));
    const groups = JSON.parse(new TextDecoder().decode(data));
    if (!Array.isArray(groups)) throw new Error('清单格式有误。');
    status.hidden = true;
    content.hidden = false;
    render(groups);
    search.addEventListener('input', () => render(groups, search.value));
  } catch (error) {
    status.textContent = error instanceof Error && error.message !== 'The operation failed for an operation-specific reason' ? error.message : '链接无法解锁清单，请让卉卉重新发送完整链接。';
  }
}
start();
