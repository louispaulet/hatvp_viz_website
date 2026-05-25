export function xmlToJson(xml) {
  if (xml.nodeType === Node.TEXT_NODE) {
    return xml.nodeValue.trim();
  }

  const obj = {};

  if (xml.attributes?.length) {
    obj.attributes = {};
    Array.from(xml.attributes).forEach((attribute) => {
      obj.attributes[attribute.nodeName] = attribute.nodeValue;
    });
  }

  Array.from(xml.childNodes || []).forEach((item) => {
    const nodeName = item.nodeName;
    const value = xmlToJson(item);

    if (value === '') {
      return;
    }

    if (typeof obj[nodeName] === 'undefined') {
      obj[nodeName] = value;
    } else if (Array.isArray(obj[nodeName])) {
      obj[nodeName].push(value);
    } else {
      obj[nodeName] = [obj[nodeName], value];
    }
  });

  return obj;
}

export function parseXml(xmlText) {
  const document = new DOMParser().parseFromString(xmlText, 'application/xml');
  const parserError = document.querySelector('parsererror');

  if (parserError) {
    throw new Error('Impossible de lire cette déclaration XML.');
  }

  return xmlToJson(document);
}

export function cleanXmlKey(value) {
  return String(value)
    .replaceAll('#text', '')
    .trim();
}
