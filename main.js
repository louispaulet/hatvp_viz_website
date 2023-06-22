$(document).ready(function() {

  // Parse CSV function
  const parseCSV = (file, callback) => {
    Papa.parse(file, {
      download: true,
      header: true,
      complete: callback
    });
  };

  // Get Top N function
  const getTopN = (data, column, order, n = 100) => {
    let sortedData = [...data];
    sortedData.sort((a, b) => order * (Number(b[column]) - Number(a[column])));
    return sortedData.slice(0, n);
  };

  // Generate table function
  const generateTable = (year, containerClass) => {
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
  };

  // Populate table function
  const populateTable = (tableId, data) => {
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
  };

  // Initialize DataTable function
  const initDataTable = (tableId, column, order) => {
    return $(`#${tableId}`).DataTable({
      "order": [[ column, order ]]
    });
  };

  // Toggle data function
  const toggleData = (table, tableId, btnId, headingId, bestData, worstData) => {
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
  };

  // Process data function
  const processData = (results) => {
    let data = results.data;

    // Compute best and worst 100 salaries overall
    let bestOverallData = getTopN(data, 'remuneration', 1);
    let worstOverallData = getTopN(data, 'remuneration', -1);

    // Generate overall table
    let {tableId, headingId} = generateTable('toujours', '.container');
    populateTable(tableId, bestOverallData);
    let table = initDataTable(tableId, 6, "desc");

    // Add overall toggle
    toggleData(table, tableId, `btnOverall`, headingId, bestOverallData, worstOverallData);

    let years = [...new Set(data.map(item => item.annee_mandat))]; // Get unique years
    years.sort((a, b) => b - a); // Sort years in descending order

    years.forEach(year => {
      // Filter data for the current year
      let yearData = data.filter(item => item.annee_mandat == year);

      // Compute best and worst 100 salaries for the year
      let bestYearData = getTopN(yearData, 'remuneration', 1);
      let worstYearData = getTopN(yearData, 'remuneration', -1);

      // Generate year table
      let {tableId, headingId} = generateTable(year, '.container');
      populateTable(tableId, bestYearData);
      let table = initDataTable(tableId, 6, "desc");

      // Add year toggle
      toggleData(table, tableId, `btn${year}`, headingId, bestYearData, worstYearData);
    });
  };

  // Parse CSV file
  parseCSV('datasets/best_of_mandatElectifDto.csv', processData);
});
