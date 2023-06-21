$(document).ready(function() {
  Papa.parse('datasets/best_of_mandatElectifDto.csv', {
    download: true,
    header: true,
    complete: function(results) {
      let data = results.data;
      // Sort by remuneration descending
      data.sort((a, b) => b.remuneration - a.remuneration);
      // Select top 10
      data = data.slice(0, 10);
      // Populate table
      data.forEach(row => {
        $('#tableBody').append(
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
          </tr>`
        );
      });
      $('#myTable').DataTable();
    }
  });
});
