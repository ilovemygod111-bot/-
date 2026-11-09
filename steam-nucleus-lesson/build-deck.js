const pptxgen = require("pptxgenjs");
const React = require("react");
const RDS = require("react-dom/server");
const sharp = require("sharp");
const { GiAtom } = require("react-icons/gi");
const { applyTheme } = require("/root/.claude/skills/synced/da05385c-bc50-49ae-a088-5b690d598725_1ea6dcc7-ccdc-4baa-aabb-cd1ffbfddb0a/pptx/scripts/apply_theme.js");

const OUT = process.argv[2] || "deck.pptx";
const THEME = {
  name: "Nucleus Lab",
  headFontFace: "Arial",
  bodyFontFace: "Arial",
  colors: {
    dk1: "1B2333", lt1: "FFFFFF", dk2: "14213D", lt2: "EEF2F8",
    accent1: "FCA311", accent2: "2563EB", accent3: "7C3AED", accent4: "EA580C", accent5: "DB2777", accent6: "059669",
    hlink: "2563EB", folHlink: "7C3AED",
  },
};
const HEX = { navy: "14213D", ink: "1B2333", dim: "5B6478", light: "EEF2F8", white: "FFFFFF", amber: "FCA311",
  P: "E11D48", N: "94A3B8", E: "0EA5E9", S: "2563EB", T: "7C3AED", En: "EA580C", A: "DB2777", M: "059669",
  green: "16A34A", yellow: "F59E0B", red: "DC2626", card: "F6F8FC", line: "D5DCE8" };

async function icon(Comp, color, px = 256) {
  const svg = RDS.renderToStaticMarkup(React.createElement(Comp, { color: "#" + color, size: px }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
  pres.rtlMode = true;
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  pres.title = "درس النواة - علوم ثالث متوسط";
  pres.subject = "النواة: العدد الذري والنظائر، ص 159-162";
  pres.author = "معلّمة العلوم";
  const C = pres.SchemeColor;
  const AR = { rtlMode: true, lang: "ar-SA" };
  const W = 13.333;

  const footer = (color) => ({ text: { text: "العلوم · الصف الثالث المتوسط · درس النواة ص 159–162", options: { x: 3.2, y: 7.0, w: 9.53, h: 0.3, fontSize: 10, color, align: "right", ...AR } } });
  // placeholders in pptxgenjs go in objects
  const layout = (title, bg, tColor, fColor) => pres.defineSlideMaster({
    title, background: { color: bg },
    objects: [
      footer(fColor),
      { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.38, w: 10.9, h: 0.9, fontSize: 34, bold: true, color: tColor, align: "right", valign: "middle", ...AR }, text: "" } },
    ],
    slideNumber: { x: 0.6, y: 7.0, w: 0.6, h: 0.3, fontSize: 10, color: bg === HEX.navy ? "CADCFC" : HEX.dim },
  });
  layout("CONTENT", HEX.white, C.text2, C.text2);
  layout("DARK", HEX.navy, C.background1, C.background2);

  const atomPng = await icon(GiAtom, HEX.white);
  const T = (s, text, o) => s.addText(text, { isTextBox: true, align: "right", valign: "top", fontSize: 15, color: C.text1, margin: 0.08, ...AR, ...o });
  const badge = (s, fill, letter, name) => {
    s.addShape(pres.shapes.OVAL, { x: 11.8, y: 0.38, w: 0.9, h: 0.9, fill: { color: fill }, line: { color: fill }, objectName: name || "badge" });
    if (letter) T(s, letter, { x: 11.8, y: 0.38, w: 0.9, h: 0.9, fontSize: 30, bold: true, color: HEX.white, align: "center", valign: "middle", rtlMode: false, objectName: "badge-letter" });
    else s.addImage({ data: atomPng, x: 11.95, y: 0.53, w: 0.6, h: 0.6, objectName: "badge-atom" });
  };
  const card = (s, x, y, w, h, fill, name, lineColor) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: fill || HEX.card }, line: { color: lineColor || fill || HEX.card, width: 1 }, objectName: name });
  const dot = (s, x, y, d, color, name) => s.addShape(pres.shapes.OVAL, { x: x - d / 2, y: y - d / 2, w: d, h: d, fill: { color }, line: { color: HEX.white, width: 0.75 }, objectName: name });

  // nucleus + Bohr shells
  function atom(s, cx, cy, p, n, shells, opt = {}) {
    const R = opt.R || [0.95, 1.6], d = opt.d || 0.22, ed = opt.ed || 0.2;
    shells.forEach((cnt, i) => {
      const r = R[i];
      s.addShape(pres.shapes.OVAL, { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r, fill: { type: "none" }, line: { color: opt.ring || HEX.line, width: 1.25 }, objectName: "shell-" + (i + 1) });
      for (let k = 0; k < cnt; k++) { const a = (k / cnt) * 2 * Math.PI - Math.PI / 2 + i * 0.4; dot(s, cx + Math.cos(a) * r, cy + Math.sin(a) * r, ed, HEX.E, "electron"); }
    });
    const A = p + n, g = Math.PI * (3 - Math.sqrt(5)), Rn = d * 0.62 * Math.sqrt(A);
    const kinds = []; let pi = 0, ni = 0;
    for (let k = 0; k < A; k++) { if ((pi / p <= ni / Math.max(1, n) && pi < p) || ni >= n) { kinds.push("P"); pi++; } else { kinds.push("N"); ni++; } }
    for (let j = 0; j < A; j++) { const rr = Rn * Math.sqrt((j + 0.5) / A), th = j * g; dot(s, cx + Math.cos(th) * rr, cy + Math.sin(th) * rr, d, HEX[kinds[j]], kinds[j] === "P" ? "proton" : "neutron"); }
  }
  const keyRow = (s, x, y, color) => {
    [["بروتون (+)", HEX.P], ["نيوترون (0)", HEX.N], ["إلكترون (−)", HEX.E]].forEach((it, i) => {
      const xx = x + i * 1.55;
      T(s, it[0], { x: xx, y, w: 1.15, h: 0.3, fontSize: 11, color: color || HEX.dim, valign: "middle" });
      dot(s, xx + 1.28, y + 0.15, 0.18, it[1], "key-dot");
    });
  };

  /* ---------- 1. Wordwall review ---------- */
  pres.addSection({ title: "مراجعة" });
  let s = pres.addSlide({ masterName: "DARK", sectionTitle: "مراجعة" });
  s.addText("مراجعة: نماذج الذرة عبر Wordwall", { placeholder: "title" });
  badge(s, HEX.amber);
  T(s, "لعبة «طابق العالِم مع نموذجه»: طابق كل عالِم بالحرف الذي يصف نموذجه، ثم العبها على Wordwall جماعياً.", { x: 3.9, y: 1.28, w: 8.8, h: 0.45, fontSize: 15, color: "CADCFC" });
  const sci = ["دالتون", "طومسون", "رذرفورد", "بور", "النموذج الحديث"];
  const desc = [["أ", "إلكترونات تدور حول النواة في مستويات طاقة محددة"], ["ب", "سحابة إلكترونية تحيط بالنواة، ولا نعرف موقع الإلكترون بدقة"], ["ج", "كرة صلبة مصمتة لا تنقسم"], ["د", "نواة صغيرة موجبة في المركز يحيط بها فراغ كبير"], ["هـ", "كرة موجبة تنتشر فيها الإلكترونات (نموذج الكعكة بالزبيب)"]];
  sci.forEach((name, i) => {
    const y = 1.95 + i * 0.94;
    card(s, 10.1, y, 2.6, 0.74, HEX.amber, "scientist-" + (i + 1));
    T(s, (i + 1) + ". " + name, { x: 10.15, y, w: 2.45, h: 0.74, fontSize: 17, bold: true, color: HEX.navy, valign: "middle" });
    card(s, 3.9, y, 5.9, 0.74, "22335C", "model-" + desc[i][0]);
    T(s, [{ text: desc[i][0] + "   ", options: { bold: true, color: HEX.amber } }, { text: desc[i][1], options: { color: HEX.white } }], { x: 4.0, y, w: 5.7, h: 0.74, fontSize: 15, valign: "middle" });
  });
  card(s, 0.6, 1.95, 3.0, 4.5, "22335C", "wordwall-steps");
  T(s, "أنشئ النشاط في Wordwall", { x: 0.75, y: 2.05, w: 2.7, h: 0.75, fontSize: 16, bold: true, color: HEX.amber });
  T(s, [
    { text: "ادخل wordwall.net وسجّل الدخول.", options: { bullet: { type: "number" }, breakLine: true } },
    { text: "اختر «إنشاء نشاط» ثم قالب «طابق» (Match up).", options: { bullet: { type: "number" }, breakLine: true } },
    { text: "اكتب الأزواج الخمسة: العالِم ونموذجه الصحيح.", options: { bullet: { type: "number" }, breakLine: true } },
    { text: "اعرض النشاط على السبورة أو شارك رابطه مع الطالبات.", options: { bullet: { type: "number" } } },
  ], { x: 0.75, y: 2.85, w: 2.7, h: 2.7, fontSize: 13, color: HEX.white, paraSpaceAfter: 6 });
  T(s, [{ text: "wordwall.net/create", options: { hyperlink: { url: "https://wordwall.net/create" }, color: HEX.amber, bold: true } }], { x: 0.75, y: 5.65, w: 2.7, h: 0.4, fontSize: 14, align: "center", rtlMode: false });
  s.addNotes("الزمن: 5 دقائق. مراجعة الدرس الأول «نماذج الذرة». الإجابات: 1 دالتون = ج، 2 طومسون = هـ، 3 رذرفورد = د، 4 بور = أ، 5 النموذج الحديث = ب. أزواج Wordwall: دالتون - كرة صلبة مصمتة لا تنقسم | طومسون - كرة موجبة تنتشر فيها الإلكترونات | رذرفورد - نواة صغيرة موجبة يحيط بها فراغ | بور - مستويات طاقة محددة | النموذج الحديث - سحابة إلكترونية. اختم بسؤال: ماذا اكتشف رذرفورد في مركز الذرة؟ للانتقال إلى درس النواة.");

  /* ---------- 2. Intro ---------- */
  pres.addSection({ title: "مقدمة الدرس" });
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "مقدمة الدرس" });
  s.addText("مقدمة الدرس: النواة", { placeholder: "title" });
  badge(s, HEX.navy);
  card(s, 0.6, 1.55, 4.6, 4.6, HEX.light, "intro-atom-card");
  atom(s, 2.9, 3.65, 6, 6, [2, 4], { R: [1.05, 1.75], d: 0.26, ed: 0.24 });
  keyRow(s, 0.65, 5.7);
  card(s, 5.6, 1.55, 7.1, 1.55, HEX.navy, "hook");
  T(s, "سؤال مثير للتفكير", { x: 5.8, y: 1.65, w: 6.7, h: 0.4, fontSize: 14, bold: true, color: HEX.amber });
  T(s, "كل ذرات الكربون فيها 6 بروتونات… فهل كل ذرات الكربون متشابهة تماماً؟", { x: 5.8, y: 2.05, w: 6.7, h: 0.95, fontSize: 20, bold: true, color: HEX.white, valign: "middle" });
  T(s, "في نهاية الدرس ستتمكّنين من:", { x: 5.6, y: 3.3, w: 7.1, h: 0.4, fontSize: 16, bold: true, color: C.text2 });
  T(s, [
    { text: "تحديد مكوّنات النواة وشحنة كل منها.", options: { bullet: true, breakLine: true } },
    { text: "تعريف العدد الذري والعدد الكتلي والنظائر.", options: { bullet: true, breakLine: true } },
    { text: "حساب عدد النيوترونات ومتوسط الكتلة الذرية للكربون.", options: { bullet: true } },
  ], { x: 5.6, y: 3.7, w: 7.1, h: 1.25, fontSize: 15, paraSpaceAfter: 4 });
  const steam = [["S", "العلوم", HEX.S], ["T", "التقنية", HEX.T], ["E", "الهندسة", HEX.En], ["A", "الفن", HEX.A], ["M", "الرياضيات", HEX.M]];
  steam.forEach((it, i) => {
    const x = 11.7 - i * 1.45;
    s.addShape(pres.shapes.OVAL, { x: x + 0.27, y: 5.15, w: 0.56, h: 0.56, fill: { color: it[2] }, line: { color: it[2] }, objectName: "steam-" + it[0] });
    T(s, it[0], { x: x + 0.27, y: 5.15, w: 0.56, h: 0.56, fontSize: 18, bold: true, color: HEX.white, align: "center", valign: "middle", rtlMode: false, margin: 0 });
    T(s, it[1], { x, y: 5.75, w: 1.1, h: 0.35, fontSize: 12, color: C.text1, align: "center" });
  });
  s.addNotes("الزمن: 5 دقائق. اعرضي السؤال واستمعي لتوقعات الطالبات دون تصحيح. استراتيجية: فكّري - زاوجي - شاركي. وضّحي أن الدرس سيمرّ بمحطات STEAM الخمس، وأن الإجابة عن السؤال ستظهر عند بناء نظائر الكربون.");

  /* ---------- 3. Science ---------- */
  pres.addSection({ title: "STEAM" });
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "STEAM" });
  s.addText("العلوم: نص قرائي «سرّ هوية العنصر»", { placeholder: "title" });
  badge(s, HEX.S, "S");
  card(s, 5.0, 1.55, 7.7, 5.2, HEX.light, "reading-text");
  T(s, "سرّ هوية العنصر", { x: 5.25, y: 1.7, w: 7.2, h: 0.45, fontSize: 19, bold: true, color: HEX.S });
  T(s, "في قلب كل ذرة نواة صغيرة جداً، لكنها تحمل سرّ هويتها. تتكوّن النواة من بروتونات موجبة الشحنة ونيوترونات متعادلة. ويُسمّى عدد البروتونات في النواة العدد الذري، وهو بطاقة الهوية التي لا تتغيّر: فكل ذرة فيها 6 بروتونات هي ذرة كربون، وإذا صارت 7 أصبحت نيتروجين.\n\nأما النيوترونات فقد يختلف عددها في ذرات العنصر نفسه، فتنتج ذرات متشابهة في خصائصها الكيميائية ومختلفة في كتلتها تُسمّى النظائر. ونحسب العدد الكتلي بجمع عدد البروتونات وعدد النيوترونات، ولا نُدخل الإلكترونات في الحساب لأن كتلتها صغيرة جداً.", { x: 5.25, y: 2.2, w: 7.2, h: 4.4, fontSize: 16, lineSpacingMultiple: 1.15 });
  T(s, "أسئلة الفهم القرائي", { x: 0.6, y: 1.55, w: 4.1, h: 0.45, fontSize: 17, bold: true, color: C.text2 });
  const rq = [["حرفي", "ما الجسيمان اللذان تتكوّن منهما النواة؟"], ["استنتاجي", "لماذا وصف النص العدد الذري بأنه «بطاقة الهوية»؟"], ["ناقد", "ذرة فيها 6 بروتونات و8 نيوترونات: هل هي عنصر جديد؟ برّري إجابتك."]];
  rq.forEach((q, i) => {
    const y = 2.1 + i * 1.18;
    card(s, 0.6, y, 4.1, 1.02, HEX.white, "question-" + (i + 1), HEX.line);
    T(s, [{ text: q[0] + ": ", options: { bold: true, color: HEX.S } }, { text: q[1] }], { x: 0.7, y, w: 3.9, h: 1.02, fontSize: 14, valign: "middle" });
  });
  T(s, "مفردات: العدد الذري · النظائر · العدد الكتلي", { x: 0.6, y: 5.75, w: 4.1, h: 0.6, fontSize: 14, bold: true, color: HEX.S, valign: "middle" });
  s.addNotes("الزمن: 10 دقائق. استراتيجية القراءة الموجّهة: قراءة صامتة دقيقتين، ثم تحديد المفردات الثلاث بلون مختلف. الإجابات: 1) البروتونات والنيوترونات. 2) لأن عدد البروتونات يحدد نوع العنصر ولا يتغيّر في ذرات العنصر نفسه. 3) ليست عنصراً جديداً؛ هي كربون لأن فيها 6 بروتونات، وهي النظير كربون-14.");

  /* ---------- 4. Engineering ---------- */
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "STEAM" });
  s.addText("الهندسة: نبني الذرة ونكوّن نظائر الكربون", { placeholder: "title" });
  badge(s, HEX.En, "E");
  const isos = [[12, 6], [13, 7], [14, 8]];
  isos.forEach((it, i) => {
    const x = 8.95 - i * 4.17;
    card(s, x, 1.5, 3.75, 2.95, HEX.light, "isotope-C" + it[0]);
    atom(s, x + 1.2, 2.95, 6, it[1], [], { d: 0.25 });
    T(s, "كربون-" + it[0], { x: x + 2.0, y: 1.75, w: 1.65, h: 0.45, fontSize: 18, bold: true, color: HEX.En });
    T(s, [{ text: "6 بروتونات", options: { breakLine: true } }, { text: it[1] + " نيوترونات", options: { breakLine: true } }, { text: "6 إلكترونات", options: { breakLine: true } }, { text: "العدد الكتلي " + it[0], options: { bold: true } }], { x: x + 2.0, y: 2.25, w: 1.65, h: 1.6, fontSize: 13 });
  });
  keyRow(s, 0.65, 4.0);
  card(s, 8.95, 4.7, 3.75, 2.1, HEX.white, "materials", HEX.line);
  T(s, "المواد", { x: 9.05, y: 4.78, w: 3.55, h: 0.4, fontSize: 16, bold: true, color: HEX.En });
  T(s, [
    { text: "صلصال أو خرز بثلاثة ألوان", options: { bullet: true, breakLine: true } },
    { text: "أسلاك أو أعواد خشبية", options: { bullet: true, breakLine: true } },
    { text: "قاعدة كرتون ولاصق", options: { bullet: true, breakLine: true } },
    { text: "بطاقات لأسماء النظائر", options: { bullet: true } },
  ], { x: 9.05, y: 5.2, w: 3.55, h: 1.55, fontSize: 13 });
  card(s, 0.6, 4.7, 8.1, 2.1, HEX.white, "steps", HEX.line);
  T(s, "خطوات البناء", { x: 0.7, y: 4.78, w: 7.9, h: 0.4, fontSize: 16, bold: true, color: HEX.En });
  T(s, [
    { text: "ابني نواة الكربون-12: 6 كرات حمراء و6 رمادية متلاصقة.", options: { bullet: { type: "number" }, breakLine: true } },
    { text: "ثبّتي 6 إلكترونات على حلقتين من السلك: 2 في الأولى و4 في الثانية.", options: { bullet: { type: "number" }, breakLine: true } },
    { text: "أضيفي نيوتروناً لتكوين الكربون-13، ثم نيوتروناً آخر لتكوين الكربون-14.", options: { bullet: { type: "number" }, breakLine: true } },
    { text: "معيار النجاح: نموذج متين، ومفتاح ألوان واضح، والتحويل بين النظائر دون إعادة البناء.", options: { bullet: { type: "number" } } },
  ], { x: 0.7, y: 5.2, w: 7.9, h: 1.55, fontSize: 13 });
  s.addNotes("الزمن: 12 دقيقة. العمل في مجموعات من 4 بأدوار: المصمّمة، والبنّاءة، والمسجّلة، والمتحدثة. السؤال الختامي للمجموعات: ما الذي تغيّر عند إضافة نيوترون؟ (الكتلة والعدد الكتلي) وما الذي بقي ثابتاً؟ (عدد البروتونات، أي العنصر). هذه إجابة سؤال المقدمة: ذرات الكربون ليست متشابهة تماماً لأن لها نظائر.");

  /* ---------- 5. Math ---------- */
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "STEAM" });
  s.addText("الرياضيات: ورقة تسجيل الاستقصاء", { placeholder: "title" });
  badge(s, HEX.M, "M");
  T(s, "سجّلي بيانات نظائر الكربون التي بنيتِها، ثم أكملي الفراغات.", { x: 0.6, y: 1.35, w: 10.9, h: 0.4, fontSize: 15, color: HEX.dim });
  const hdr = ["النظير", "الرمز", "البروتونات", "النيوترونات", "الإلكترونات", "العدد الكتلي", "نسبته في الطبيعة"];
  const rows = [
    ["كربون-12", "¹²C", "6", "6", "6", "12", "98.9%"],
    ["كربون-13", "¹³C", "6", "......", "6", "......", "1.1%"],
    ["كربون-14", "¹⁴C", "......", "......", "......", "14", "آثار ضئيلة جداً"],
  ];
  const hcell = (t) => ({ text: t, options: { bold: true, color: HEX.white, fill: { color: HEX.M }, align: "center", valign: "middle", fontSize: 14, ...AR } });
  const bcell = (t, i) => ({ text: t, options: { color: t === "......" ? HEX.M : HEX.ink, bold: t === "......", fill: { color: i % 2 ? HEX.white : HEX.light }, align: "center", valign: "middle", fontSize: 15, ...AR } });
  const rev = (a) => a.slice().reverse();
  s.addTable([rev(hdr).map(hcell)].concat(rows.map((r, i) => rev(r).map((t) => bcell(t, i)))), {
    x: 0.6, y: 1.85, w: 12.1, colW: [2.1, 1.65, 1.65, 1.75, 1.65, 1.35, 1.95], rowH: [0.55, 0.6, 0.6, 0.6], border: { type: "solid", color: HEX.line, pt: 1 }, objectName: "inquiry-table",
  });
  card(s, 6.85, 4.55, 5.85, 2.25, HEX.light, "formula");
  T(s, "القاعدة", { x: 6.95, y: 4.65, w: 5.65, h: 0.4, fontSize: 16, bold: true, color: HEX.M });
  T(s, [{ text: "العدد الكتلي = البروتونات + النيوترونات", options: { breakLine: true } }, { text: "النيوترونات = العدد الكتلي − العدد الذري", options: { breakLine: true } }, { text: "استنتاجي: كلما زاد عدد النيوترونات بمقدار 1، زاد العدد الكتلي بمقدار ......", options: {} }], { x: 6.95, y: 5.1, w: 5.65, h: 1.6, fontSize: 14, paraSpaceAfter: 4 });
  card(s, 0.6, 4.55, 5.95, 2.25, HEX.white, "average-mass", HEX.M);
  T(s, "احسبي متوسط الكتلة الذرية للكربون", { x: 0.7, y: 4.65, w: 5.75, h: 0.4, fontSize: 16, bold: true, color: HEX.M });
  T(s, "(12 × 0.989) + (13 × 0.011) = ............ u", { x: 0.7, y: 5.15, w: 5.75, h: 0.6, fontSize: 19, bold: true, align: "center", rtlMode: false });
  T(s, "قارني ناتجك بالكتلة الذرية للكربون في الجدول الدوري. لماذا هي أقرب إلى 12؟", { x: 0.7, y: 5.85, w: 5.75, h: 0.85, fontSize: 14 });
  s.addNotes("الزمن: 10 دقائق. استراتيجية الاستقصاء الموجّه. الإجابات: كربون-13 فيه 7 نيوترونات وعدده الكتلي 13. كربون-14 فيه 6 بروتونات و8 نيوترونات و6 إلكترونات. الاستنتاج: يزيد العدد الكتلي بمقدار 1. متوسط الكتلة = 11.868 + 0.143 = 12.011 u، وهو أقرب إلى 12 لأن الكربون-12 يشكّل 98.9% من ذرات الكربون. اطبعي الجدول ورقة عمل لكل مجموعة.");

  /* ---------- 6. Art ---------- */
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "STEAM" });
  s.addText("الفن: تصميم بصري علمي لنموذج الذرة", { placeholder: "title" });
  badge(s, HEX.A, "A");
  card(s, 0.6, 1.5, 6.3, 5.3, HEX.light, "art-example");
  atom(s, 3.0, 4.05, 6, 8, [2, 4], { R: [1.05, 1.8], d: 0.25, ed: 0.25 });
  T(s, "¹⁴₆C  كربون-14", { x: 0.8, y: 1.6, w: 5.9, h: 0.5, fontSize: 20, bold: true, color: HEX.A, rtlMode: true });
  [["النواة: 6 بروتونات + 8 نيوترونات", 2.6], ["المستوى الأول: 2 إلكترون", 3.25], ["المستوى الثاني: 4 إلكترونات", 3.9]].forEach((lb, i) => {
    T(s, lb[0], { x: 4.95, y: lb[1], w: 1.85, h: 0.6, fontSize: 12, bold: true, color: HEX.ink, valign: "middle" });
  });
  s.addShape(pres.shapes.LINE, { x: 3.25, y: 2.9, w: 1.65, h: 0.95, line: { color: HEX.A, width: 1.25, endArrowType: "none" }, flipV: true, objectName: "callout-nucleus" });
  keyRow(s, 0.75, 6.25);
  T(s, "معايير التصميم البصري العلمي", { x: 7.3, y: 1.5, w: 5.4, h: 0.45, fontSize: 18, bold: true, color: HEX.A });
  const crit = ["مفتاح ألوان ثابت: لون لكل جسيم", "عدد الجسيمات صحيح علمياً", "النواة في المركز، ومستويات الطاقة حولها", "عنوان ورمز النظير مثل ¹⁴₆C", "بطاقات توضيحية وأسهم تشرح الأجزاء", "توازن في التوزيع ووضوح في الألوان"];
  crit.forEach((c, i) => {
    const y = 2.05 + i * 0.6;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 12.35, y: y + 0.1, w: 0.32, h: 0.32, rectRadius: 0.05, fill: { color: HEX.white }, line: { color: HEX.A, width: 1.5 }, objectName: "checkbox" });
    T(s, c, { x: 7.3, y, w: 4.95, h: 0.52, fontSize: 15, valign: "middle" });
  });
  card(s, 7.3, 5.75, 5.4, 1.05, HEX.A, "art-task");
  T(s, "المهمة: ارسمي أحد نظائر الكربون الثلاثة على ورقة A4 أو صمّميه رقمياً، والتزمي بالمعايير.", { x: 7.4, y: 5.75, w: 5.2, h: 1.05, fontSize: 14, bold: true, color: HEX.white, valign: "middle" });
  s.addNotes("الزمن: 10 دقائق. يمكن تقسيم النظائر الثلاثة على المجموعات ثم عمل معرض جداري. نبّهي إلى أن الرسم ليس بمقياس رسم: النواة في الحقيقة أصغر من الذرة بنحو 100,000 مرة. تُقيَّم الرسومات بقائمة المعايير الستة (درجة لكل معيار).");

  /* ---------- 7. Technology ---------- */
  s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "STEAM" });
  s.addText("التقنية: تحدي عالِمة الذرة", { placeholder: "title" });
  badge(s, HEX.T, "T");
  T(s, "افتحي محاكاة «بناء ذرة» على الجهاز اللوحي، ونفّذي المهمات بالترتيب. لكل مهمة نقاط، والفريق الأعلى نقاطاً يفوز بلقب «عالِمة الذرة».", { x: 0.6, y: 1.35, w: 10.9, h: 0.7, fontSize: 15, color: HEX.dim });
  const missions = [
    ["المهمة 1", "10 نقاط", "ابني ذرة كربون-12 متعادلة الشحنة."],
    ["المهمة 2", "10 نقاط", "حوّليها إلى كربون-14 دون أن يتغيّر العنصر."],
    ["المهمة 3", "15 نقطة", "اجعلي الذرة أيوناً موجباً، واكتبي شحنته."],
    ["المهمة 4", "15 نقطة", "ما أقل تغيير يحوّل الكربون إلى نيتروجين؟ جرّبيه."],
  ];
  missions.forEach((m, i) => {
    const x = 9.75 - i * 3.05;
    card(s, x, 2.25, 2.85, 2.6, HEX.light, "mission-" + (i + 1));
    s.addShape(pres.shapes.OVAL, { x: x + 2.05, y: 2.4, w: 0.62, h: 0.62, fill: { color: HEX.T }, line: { color: HEX.T }, objectName: "mission-num" });
    T(s, String(i + 1), { x: x + 2.05, y: 2.4, w: 0.62, h: 0.62, fontSize: 20, bold: true, color: HEX.white, align: "center", valign: "middle", rtlMode: false, margin: 0 });
    T(s, m[1], { x: x + 0.15, y: 2.5, w: 1.8, h: 0.4, fontSize: 13, bold: true, color: HEX.T, align: "left" });
    T(s, m[2], { x: x + 0.15, y: 3.15, w: 2.55, h: 1.55, fontSize: 15 });
  });
  card(s, 6.85, 5.1, 5.85, 1.7, HEX.white, "roles", HEX.line);
  T(s, "أدوار الفريق", { x: 6.95, y: 5.18, w: 5.65, h: 0.4, fontSize: 16, bold: true, color: HEX.T });
  T(s, "الباحثة تشغّل المحاكاة · المسجّلة تدوّن النتائج · ضابطة الوقت 3 دقائق لكل مهمة · المتحدثة تعرض الحل", { x: 6.95, y: 5.6, w: 5.65, h: 1.1, fontSize: 14 });
  card(s, 0.6, 5.1, 5.95, 1.7, HEX.T, "sim-links");
  T(s, "أدوات التحدي", { x: 0.7, y: 5.18, w: 5.75, h: 0.4, fontSize: 16, bold: true, color: HEX.white });
  T(s, [
    { text: "محاكاة بناء ذرة المجانية بالعربية: ", options: { color: HEX.white } },
    { text: "phet.colorado.edu", options: { hyperlink: { url: "https://phet.colorado.edu/ar_SA/simulations/build-an-atom" }, color: HEX.amber, bold: true, breakLine: true } },
    { text: "مختبر النواة ثلاثي الأبعاد والواقع الافتراضي: ", options: { color: HEX.white } },
    { text: "رابط المختبر", options: { hyperlink: { url: "https://claude.ai/artifact/XzXGmLZ5ZbCXXQGM7KCSJy" }, color: HEX.amber, bold: true } },
  ], { x: 0.7, y: 5.62, w: 5.75, h: 1.1, fontSize: 14, paraSpaceAfter: 6 });
  s.addNotes("الزمن: 12 دقيقة. استراتيجية التعلّم باللعب والتعلّم التعاوني. الإجابات: 1) 6 بروتونات و6 نيوترونات و6 إلكترونات. 2) إضافة نيوترونين (8 نيوترونات). 3) إزالة إلكترون أو أكثر؛ إزالة إلكترون واحد تعطي شحنة +1. 4) إضافة بروتون واحد (العدد الذري يصبح 7). ملاحظة: رابط مختبر النواة يحتاج أن تجعليه عاماً من زر المشاركة قبل الحصة.");

  /* ---------- 8. Final assessment ---------- */
  pres.addSection({ title: "التقويم الختامي" });
  s = pres.addSlide({ masterName: "DARK", sectionTitle: "التقويم الختامي" });
  s.addText("التقويم الختامي: ثلاثة مستويات", { placeholder: "title" });
  badge(s, HEX.amber);
  const lv = [
    [HEX.green, "المستوى الأول", "تذكّر", "العدد الذري هو عدد ............ في نواة الذرة.", "أ) النيوترونات\nب) البروتونات\nج) الإلكترونات"],
    [HEX.yellow, "المستوى الثاني", "تطبيق", "ذرة كربون عددها الذري 6 وعددها الكتلي 13. كم نيوتروناً في نواتها؟ اكتبي خطوات الحل.", ""],
    [HEX.red, "المستوى الثالث", "تحليل", "ذرتان: الأولى فيها 6 بروتونات و8 نيوترونات، والثانية فيها 7 بروتونات و7 نيوترونات. لهما العدد الكتلي نفسه. هل هما نظيران؟ فسّري.", ""],
  ];
  lv.forEach((l, i) => {
    const x = 8.75 - i * 4.07;
    card(s, x, 1.6, 3.95, 5.15, HEX.white, "level-" + (i + 1));
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.6, w: 3.95, h: 1.05, rectRadius: 0.12, fill: { color: l[0] }, line: { color: l[0] }, objectName: "level-head-" + (i + 1) });
    T(s, l[1], { x: x + 0.15, y: 1.66, w: 3.65, h: 0.5, fontSize: 20, bold: true, color: HEX.white, valign: "middle" });
    T(s, l[2], { x: x + 0.15, y: 2.12, w: 3.65, h: 0.45, fontSize: 15, color: HEX.white, valign: "middle" });
    T(s, l[3], { x: x + 0.2, y: 2.85, w: 3.55, h: 2.4, fontSize: 17, bold: true, color: HEX.ink });
    if (l[4]) T(s, l[4], { x: x + 0.2, y: 4.3, w: 3.55, h: 1.6, fontSize: 15, color: HEX.ink });
    else T(s, "...........................................\n...........................................", { x: x + 0.2, y: 5.2, w: 3.55, h: 1.2, fontSize: 15, color: HEX.dim });
  });
  s.addNotes("الزمن: 8 دقائق. تختار كل طالبة البدء بالمستوى الأخضر ثم تنتقل إلى الأصفر فالأحمر (تمايز). الإجابات: الأخضر: ب) البروتونات. الأصفر: النيوترونات = 13 - 6 = 7. الأحمر: ليستا نظيرين؛ النظائر لها عدد البروتونات نفسه، والذرتان مختلفتان في عدد البروتونات (6 كربون و7 نيتروجين) فهما عنصران مختلفان رغم تساوي العدد الكتلي 14. اختمي ببطاقة خروج وإكمال عمود «ماذا تعلّمت» في جدول KWL.");

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("written", OUT);
})();
