// Function to format XML data as HTML
function formatXMLData(data, depthThreshold) {
  var html = '';
  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      if (data.length > 0 && typeof data[0] === 'object') {
        html += '<table>';
        html += '<thead><tr>';
        for (var key in data[0]) {
          html += '<th>' + key + '</th>';
        }
        html += '</tr></thead>';
        html += '<tbody>';
        data.forEach(function(item) {
          html += '<tr>';
          for (var key in item) {
            html += '<td>' + formatXMLData(item[key], depthThreshold) + '</td>';
          }
          html += '</tr>';
        });
        html += '</tbody>';
        html += '</table>';
      } else {
        html += data.join(', ');
      }
    } else {
      if (Object.keys(data).length > depthThreshold) {
        html += '<table>';
        for (var key in data) {
          html += '<tr>';
          html += '<td>' + key + '</td>';
          html += '<td>' + formatXMLData(data[key], depthThreshold) + '</td>';
          html += '</tr>';
        }
        html += '</table>';
      } else {
        html += '<ul>';
        for (var key in data) {
          html += '<li>' + key + ': ' + formatXMLData(data[key], depthThreshold) + '</li>';
        }
        html += '</ul>';
      }
    }
  } else {
    html += data;
  }
  return html;
}

// Fetch XML data
function fetchXMLData(url) {
  $.ajax({
    url: url,
    dataType: 'xml',
    success: function(data) {
      var jsonData = xmlToJson(data);
      var xmlHtml = formatXMLData(jsonData, 3); // Depth threshold: 3
      $('#xmlData').html(xmlHtml);
    },
    error: function() {
      $('#xmlData').html('<p>Error loading XML data.</p>');
    }
  });
}

// Populate URL dropdown
function populateDropdown(urls) {
  var dropdown = $('#urlDropdown');
  dropdown.empty();
  for (var i = 0; i < urls.length; i++) {
    var url = urls[i];
    dropdown.append($('<option></option>').attr('value', url).text(url));
  }
}

// Load XML data on button click
$('#loadButton').click(function() {
  var selectedUrl = $('#urlDropdown').val();
  if (selectedUrl) {
    fetchXMLData(selectedUrl);
  }
});

// Fetch CSV data
$.ajax({
  url: 'https://raw.githubusercontent.com/louispaulet/hatvp_viz/main/datasets/xml_unitary_declarations/content/unitary_dataset_url_df.csv',
  dataType: 'text',
  success: function(data) {
    var urls = parseCSV(data);
    populateDropdown(urls);
  },
  error: function() {
    $('#xmlData').html('<p>Error loading URL data.</p>');
  }
});

// Parse CSV data
function parseCSV(csvData) {
  var urls = [];
  var rows = csvData.split('\n');
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i].split(',');
    if (row.length === 2) {
      var url = row[1].trim();
      if (url) {
        urls.push(url);
      }
    }
  }
  return urls;
}

// XML to JSON conversion function
function xmlToJson(xml) {
  var obj = {};
  if (xml.nodeType == 1) {
    if (xml.attributes.length > 0) {
      obj['attributes'] = {};
      for (var j = 0; j < xml.attributes.length; j++) {
        var attribute = xml.attributes.item(j);
        obj['attributes'][attribute.nodeName] = attribute.nodeValue;
      }
    }
  } else if (xml.nodeType == 3) {
    obj = xml.nodeValue.trim();
  }
  if (xml.hasChildNodes()) {
    for (var i = 0; i < xml.childNodes.length; i++) {
      var item = xml.childNodes.item(i);
      var nodeName = item.nodeName;
      if (typeof obj[nodeName] == 'undefined') {
        obj[nodeName] = xmlToJson(item);
      } else {
        if (typeof obj[nodeName].push == 'undefined') {
          var old = obj[nodeName];
          obj[nodeName] = [];
          obj[nodeName].push(old);
        }
        obj[nodeName].push(xmlToJson(item));
      }
    }
  }
  return obj;
}
