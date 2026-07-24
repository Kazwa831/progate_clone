import type { JudgeResult } from "./types";

function checkContainsTag(
  doc: Document,
  checkRule: Record<string, unknown>
): JudgeResult {
  const tag = checkRule.tag as string;
  const expectedText = checkRule.textContent as string | undefined;
  const attribute = checkRule.attribute as string | undefined;
  const expectedAttributeValue = checkRule.attributeValue as string | undefined;
  const minCount = checkRule.minCount as number | undefined;

  const elements = Array.from(doc.querySelectorAll(tag));
  if (elements.length === 0) {
    return { correct: false, message: `${tag} が見つかりません` };
  }

  if (minCount !== undefined && elements.length < minCount) {
    return {
      correct: false,
      message: `${tag} が${minCount}個以上見つかりません`,
    };
  }

  if (
    expectedText !== undefined &&
    !elements.some((el) => el.textContent?.trim() === expectedText)
  ) {
    return {
      correct: false,
      message: `${tag}の中身が「${expectedText}」になっていません`,
    };
  }

  if (
    attribute !== undefined &&
    expectedAttributeValue !== undefined &&
    !elements.some((el) => el.getAttribute(attribute) === expectedAttributeValue)
  ) {
    return {
      correct: false,
      message: `${tag}の${attribute}属性が「${expectedAttributeValue}」になっていません`,
    };
  }

  return { correct: true };
}

// ブラウザに実際にCSS値を解決させることで、"red" と "rgb(255, 0, 0)" のような
// 表記ゆれを吸収する（プロパティごとに正規化ルールを個別実装しなくて済む）。
function resolveCssValue(doc: Document, property: string, value: string): string {
  const probe = doc.createElement("div");
  probe.style.setProperty(property, value);
  doc.body.appendChild(probe);
  const resolved =
    doc.defaultView?.getComputedStyle(probe).getPropertyValue(property) ?? value;
  doc.body.removeChild(probe);
  return resolved.trim();
}

function checkCssProperty(
  doc: Document,
  checkRule: Record<string, unknown>
): JudgeResult {
  const selector = checkRule.selector as string;
  const property = checkRule.property as string;
  const expectedValue = checkRule.value as string;

  const element = doc.querySelector(selector);
  if (!element) {
    return { correct: false, message: `${selector} が見つかりません` };
  }

  const actual = doc.defaultView
    ?.getComputedStyle(element)
    .getPropertyValue(property)
    .trim();
  const expected = resolveCssValue(doc, property, expectedValue);

  if (actual === expected) {
    return { correct: true };
  }

  return {
    correct: false,
    message: `${selector}の${property}が「${expectedValue}」になっていません`,
  };
}

export function judgeExercise(
  iframeDoc: Document,
  checkType: string,
  checkRule: Record<string, unknown>
): JudgeResult {
  switch (checkType) {
    case "contains-tag":
      return checkContainsTag(iframeDoc, checkRule);
    case "css-property":
      return checkCssProperty(iframeDoc, checkRule);
    default:
      return { correct: false, message: "未対応の判定タイプです" };
  }
}
