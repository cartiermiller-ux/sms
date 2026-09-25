/**
 * 国家 / 地区与手机区号
 *
 * ⚠️ 重要说明（不要误以为选了区号就能真的用海外号码登录）：
 *   当前服务端的手机号校验是 `/^1[0-9]{10}$/`（中国大陆 11 位手机号），
 *   登录/注册接口也只接收 `phone` 一个字段，**没有接收国家区号**。
 *   所以这里的区号目前只做到：
 *     1) 界面显示随选择变化
 *     2) 前端按所选地区放宽/收紧位数校验
 *   要真正支持海外号码，需要后端改两处：
 *     · 校验规则支持 E.164（如 `^\+?[1-9]\d{6,14}$`）
 *     · 接口增加区号字段（或直接把号码存成 E.164 格式）
 */

/** 常用国家 / 地区（中国大陆置顶；面向中国 + 东南亚为主的用户群） */
export const COUNTRIES = [
	{ code: '86', name: '中国大陆', en: 'China' },
	{ code: '852', name: '中国香港', en: 'Hong Kong' },
	{ code: '853', name: '中国澳门', en: 'Macao' },
	{ code: '886', name: '中国台湾', en: 'Taiwan' },
	{ code: '95', name: '缅甸', en: 'Myanmar' },
	{ code: '66', name: '泰国', en: 'Thailand' },
	{ code: '84', name: '越南', en: 'Vietnam' },
	{ code: '856', name: '老挝', en: 'Laos' },
	{ code: '855', name: '柬埔寨', en: 'Cambodia' },
	{ code: '60', name: '马来西亚', en: 'Malaysia' },
	{ code: '65', name: '新加坡', en: 'Singapore' },
	{ code: '62', name: '印度尼西亚', en: 'Indonesia' },
	{ code: '63', name: '菲律宾', en: 'Philippines' },
	{ code: '673', name: '文莱', en: 'Brunei' },
	{ code: '81', name: '日本', en: 'Japan' },
	{ code: '82', name: '韩国', en: 'South Korea' },
	{ code: '850', name: '朝鲜', en: 'North Korea' },
	{ code: '91', name: '印度', en: 'India' },
	{ code: '92', name: '巴基斯坦', en: 'Pakistan' },
	{ code: '880', name: '孟加拉国', en: 'Bangladesh' },
	{ code: '94', name: '斯里兰卡', en: 'Sri Lanka' },
	{ code: '977', name: '尼泊尔', en: 'Nepal' },
	{ code: '1', name: '美国 / 加拿大', en: 'USA / Canada' },
	{ code: '44', name: '英国', en: 'United Kingdom' },
	{ code: '61', name: '澳大利亚', en: 'Australia' },
	{ code: '64', name: '新西兰', en: 'New Zealand' },
	{ code: '7', name: '俄罗斯', en: 'Russia' },
	{ code: '49', name: '德国', en: 'Germany' },
	{ code: '33', name: '法国', en: 'France' },
	{ code: '39', name: '意大利', en: 'Italy' },
	{ code: '34', name: '西班牙', en: 'Spain' },
	{ code: '31', name: '荷兰', en: 'Netherlands' },
	{ code: '41', name: '瑞士', en: 'Switzerland' },
	{ code: '46', name: '瑞典', en: 'Sweden' },
	{ code: '48', name: '波兰', en: 'Poland' },
	{ code: '90', name: '土耳其', en: 'Turkey' },
	{ code: '971', name: '阿联酋', en: 'United Arab Emirates' },
	{ code: '966', name: '沙特阿拉伯', en: 'Saudi Arabia' },
	{ code: '972', name: '以色列', en: 'Israel' },
	{ code: '20', name: '埃及', en: 'Egypt' },
	{ code: '27', name: '南非', en: 'South Africa' },
	{ code: '234', name: '尼日利亚', en: 'Nigeria' },
	{ code: '254', name: '肯尼亚', en: 'Kenya' },
	{ code: '55', name: '巴西', en: 'Brazil' },
	{ code: '54', name: '阿根廷', en: 'Argentina' },
	{ code: '56', name: '智利', en: 'Chile' },
	{ code: '52', name: '墨西哥', en: 'Mexico' },
	{ code: '57', name: '哥伦比亚', en: 'Colombia' }
];

/** 默认区号：中国大陆 */
export const DEFAULT_COUNTRY_CODE = '86';

/** 按区号取国家对象；找不到时返回一个兜底对象，保证界面不会空 */
export function findCountry(code) {
	const c = String(code || '').replace(/^\+/, '');
	return COUNTRIES.find(x => x.code === c) || { code: c || DEFAULT_COUNTRY_CODE, name: '未知地区', en: '' };
}

/**
 * 手机号输入框的最大长度：
 * 中国大陆固定 11 位；其他地区按 E.164 上限给到 15 位
 */
export function phoneMaxLen(code) {
	return String(code) === '86' ? 11 : 15;
}

/**
 * 手机号校验（前端预校验，真正的把关在服务端）
 *   · +86  ：沿用原有规则 1 开头的 11 位
 *   · 其他 ：只做长度与纯数字校验（服务端目前仍只认大陆号码，见文件头说明）
 */
export function isValidPhone(code, phone) {
	const v = String(phone || '').trim();
	if (!v || !/^\d+$/.test(v)) return false;
	if (String(code) === '86') return /^1\d{10}$/.test(v);
	return v.length >= 4 && v.length <= 15;
}

/** 拼成 E.164 形式的完整号码（仅用于展示 / 未来对接，当前接口未使用） */
export function toE164(code, phone) {
	return '+' + String(code || '').replace(/^\+/, '') + String(phone || '').trim();
}

export default {
	COUNTRIES,
	DEFAULT_COUNTRY_CODE,
	findCountry,
	phoneMaxLen,
	isValidPhone,
	toE164
};
