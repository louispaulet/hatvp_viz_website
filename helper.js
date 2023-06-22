// Parse CSV function
function parseCSV(file, callback){
    Papa.parse(file, {
      download: true,
      header: true,
      complete: callback
    });
  }

  // Get Top N function
function getTopN(data, column, order, n = 100){
    let sortedData = [...data];
    sortedData.sort((a, b) => order * (Number(b[column]) - Number(a[column])));
    return sortedData.slice(0, n);
  }

  // Generate table function
function generateTable(year, containerClass){
    let tableId = `table${year}`;
    let headingId = `heading${year}`;
    $(containerClass).append(`
      <h2 id="${headingId}" class="mt-5">Meilleurs salaires pour ${year}</h2>
      <button id="btn${year}" class="btn btn-primary mb-2">Voir les pires salaires</button>
      <table id="${tableId}" class="table table-striped table-bordered" style="width:100%">
        <thead>
          <tr>
            <th>ID</th>
            <th>Date</th>
            <th>Type de Mandat</th>
            <th>Prénom</th>
            <th>Nom</th>
            <th>Date de Naissance</th>
            <th>Rémunération</th>
            <th>Année du Mandat</th>
            <th>Code Postal</th>
            <th>Description Mandat</th>
          </tr>
        </thead>
        <tbody>
        </tbody>
      </table>
    `);
    return {tableId, headingId};
  }

  // Populate table function
function populateTable(tableId, data){
    $(`#${tableId} tbody`).html(''); // Clear existing data
    data.forEach(row => {
      $(`#${tableId} tbody`).append(
        `<tr>
          <td>${row['']}</td>
          <td>${row['date_depot']}</td>
          <td>${row['type_mandat']}</td>
          <td>${row['declarant_prenom']}</td>
          <td>${row['declarant_nom']}</td>
          <td>${row['declarant_date_naissance']}</td>
          <td>${row['remuneration']}</td>
          <td>${row['annee_mandat']}</td>
          <td>${row['code_postal']}</td>
          <td>${row['description_mandat']}</td>
        </tr>`
      );
    });
  }

  // Initialize DataTable function
function initDataTable(tableId, column, order){
    return $(`#${tableId}`).DataTable({
      "order": [[ column, order ]]
    });
  }

  // Toggle data function
function toggleData(table, tableId, btnId, headingId, bestData, worstData){
    $(`#${btnId}`).on('click', function() {
      // Destroy the existing table
      table.destroy();
      if ($(this).text() === 'Voir les pires salaires') {
        // Populate with worst salaries and reinitialize DataTable
        populateTable(tableId, worstData);
        table = initDataTable(tableId, 6, "asc");
        $(this).text('Voir les meilleurs salaires');
        $(`#${headingId}`).text(`Pires salaires pour ${year}`);
      } else {
        // Populate with best salaries and reinitialize DataTable
        populateTable(tableId, bestData);
        table = initDataTable(tableId, 6, "desc");
        $(this).text('Voir les pires salaires');
        $(`#${headingId}`).text(`Meilleurs salaires pour ${year}`);
      }
    });
  }