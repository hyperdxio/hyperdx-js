export function limitLen(s: string, cap: number): string {
  if (s.length > cap) {
    return s.substring(0, cap);
  } else {
    return s;
  }
}

// from: https://github.com/open-telemetry/opentelemetry-js/blob/812c774998fb60a0c666404ae71b1d508e0568f4/packages/opentelemetry-sdk-trace-web/src/utils.ts#L365
/**
 * Get element XPath
 * @param target - target element
 * @param optimised - when id attribute of element is present the xpath can be
 * simplified to contain id
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export function getElementXPath(target: any, optimised?: boolean): string {
  if (target.nodeType === Node.DOCUMENT_NODE) {
    return '/';
  }
  const targetValue = getNodeValue(target, optimised);
  if (optimised && targetValue.indexOf('@id') > 0) {
    return targetValue;
  }
  let xpath = '';
  if (target.parentNode) {
    xpath += getElementXPath(target.parentNode, false);
  }
  xpath += targetValue;

  return xpath;
}

// from: https://github.com/open-telemetry/opentelemetry-js/blob/812c774998fb60a0c666404ae71b1d508e0568f4/packages/opentelemetry-sdk-trace-web/src/utils.ts#L365
/**
 * get node value for xpath
 * @param target
 * @param optimised
 */
function getNodeValue(target: HTMLElement, optimised?: boolean): string {
  const nodeType = target.nodeType;
  const index = getNodeIndex(target);
  let nodeValue = '';
  if (nodeType === Node.ELEMENT_NODE) {
    const id = target.getAttribute('id');
    if (optimised && id) {
      return `//*[@id="${id}"]`;
    }
    nodeValue = target.localName;
  } else if (
    nodeType === Node.TEXT_NODE ||
    nodeType === Node.CDATA_SECTION_NODE
  ) {
    nodeValue = 'text()';
  } else if (nodeType === Node.COMMENT_NODE) {
    nodeValue = 'comment()';
  } else {
    return '';
  }
  // if index is 1 it can be omitted in xpath
  if (nodeValue && index > 1) {
    return `/${nodeValue}[${index}]`;
  }
  return `/${nodeValue}`;
}

// from: https://github.com/open-telemetry/opentelemetry-js/blob/812c774998fb60a0c666404ae71b1d508e0568f4/packages/opentelemetry-sdk-trace-web/src/utils.ts#L365
/**
 * get node index within the siblings
 * @param target
 */
function getNodeIndex(target: HTMLElement): number {
  if (!target.parentNode) {
    return 0;
  }
  const allowedTypes = [target.nodeType];
  if (target.nodeType === Node.CDATA_SECTION_NODE) {
    allowedTypes.push(Node.TEXT_NODE);
  }
  let elements = Array.from(target.parentNode.childNodes);
  elements = elements.filter((element: Node) => {
    const localName = (element as HTMLElement).localName;
    return (
      allowedTypes.indexOf(element.nodeType) >= 0 &&
      localName === target.localName
    );
  });
  if (elements.length >= 1) {
    return elements.indexOf(target) + 1; // xpath starts from 1
  }
  // if there are no other similar child xpath doesn't need index
  return 0;
}
