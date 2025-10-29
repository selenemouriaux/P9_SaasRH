import { ROUTES_PATH } from "../constants/routes.js";
import Logout from "./Logout.js";

export default class NewBill {
  constructor({ document, onNavigate, store, localStorage }) {
    this.document = document;
    this.onNavigate = onNavigate;
    this.store = store;
    const formNewBill = this.document.querySelector(
      `form[data-testid="form-new-bill"]`
    );
    formNewBill.addEventListener("submit", this.handleSubmit);
    const file = this.document.querySelector(`input[data-testid="file"]`);
    file.addEventListener("change", this.handleChangeFile);
    this.fileUrl = null;
    this.fileName = null;
    this.billId = null;
    new Logout({ document, localStorage, onNavigate });
  }

  handleChangeFile = (e) => {
    e.preventDefault();
    const file = this.document.querySelector(`input[data-testid="file"]`)
      .files[0];
    // on vérifié qu'il y a bien un fichier, sinon on avorte
    if (!file) {
      return;
    }

    // on contraint et valide ici aussi le type de fichier
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      alert(
        "Format de fichier non supporté. Veuillez sélectionner une image (JPG, JPEG ou PNG)."
      );
      e.target.value = "";
      return;
    }

    // on stocke le fichier en local, SUPPRESSION du call API et suppression des entrées orphelines !
    this.selectedFile = file;
  };

  // CODE D'ORIGINE :
  // handleChangeFile = (e) => {
  //   e.preventDefault();
  //   const file = this.document.querySelector(`input[data-testid="file"]`)
  //     .files[0];
  //   const filePath = e.target.value.split(/\\/g);
  //   const fileName = filePath[filePath.length - 1];
  //   const formData = new FormData();
  //   const email = JSON.parse(localStorage.getItem("user")).email;
  //   formData.append("file", file);
  //   formData.append("email", email);

  //   this.store
  //     .bills()
  //     .create({
  //       data: formData,
  //       headers: {
  //         noContentType: true,
  //       },
  //     })
  //     .then(({ fileUrl, key }) => {
  //       console.log(fileUrl);
  //       this.billId = key;
  //       this.fileUrl = fileUrl;
  //       this.fileName = fileName;
  //     })

  // -------------------------------------------------------
  // test du retour API a priori daubé
  // .then((response) => {
  //   console.log("=== RETOUR DU BACK ===");
  //   console.log("response:", response);
  //   console.log("type: ", typeof response);
  //   console.log("keys: ", Object.keys(response));
  //   console.log("===================================");

  //   const { fileUrl, key } = response;
  //   console.log("après destructuration: ");
  //   console.log("fileUrl: ", fileUrl);
  //   console.log("key: ", key);
  // })
  //--------------------------------------------------------

  // .catch((error) => console.error(error));
  // };

  handleSubmit = (e) => {
    e.preventDefault();

    // Forçage d'un dépôt de document
    if (!this.selectedFile) {
      alert("Veuillez joindre un justificatif.");
      return;
    }

    const email = JSON.parse(localStorage.getItem("user")).email;

    // préparation du formData
    const formData = new FormData();
    formData.append("file", this.selectedFile);
    formData.append("email", email);

    // Upload UNIQUE et VERIFIÉ
    this.store
      .bills()
      .create({
        data: formData,
        headers: {
          noContentType: true,
        },
      })
      .then((response) => {
        console.log(response);

        // on s'assure que le back a bien traité le doc ou on avorte
        if (
          !response.filePath ||
          response.filePath === "null" ||
          !response.fileName ||
          response.fileName === "null"
        ) {
          alert(
            "Erreur lors de l'upload du fichier. Veuillez sélectionner une image valide."
          );
          return;
        }

        // construction de l'url
        const fileUrl = `http://localhost:5678/${response.filePath
          .split("/")
          .pop()}`;

        this.billId = response.key;

        // création de l'entrée complète en base
        const bill = {
          email,
          type: e.target.querySelector(`select[data-testid="expense-type"]`)
            .value,
          name: e.target.querySelector(`input[data-testid="expense-name"]`)
            .value,
          amount: parseInt(
            e.target.querySelector(`input[data-testid="amount"]`).value
          ),
          date: e.target.querySelector(`input[data-testid="datepicker"]`).value,
          vat: e.target.querySelector(`input[data-testid="vat"]`).value,
          pct:
            parseInt(
              e.target.querySelector(`input[data-testid="pct"]`).value
            ) || 20,
          commentary: e.target.querySelector(
            `textarea[data-testid="commentary"]`
          ).value,
          fileUrl: fileUrl,
          fileName: this.selectedFile.name,
          status: "pending",
        };

        // maj de l'entrée
        this.updateBill(bill);
        this.onNavigate(ROUTES_PATH["Bills"]);
      })
      .catch((error) => {
        console.error(error);
        alert("Erreur lors de l'envoi de la facture. Veuillez réessayer.");
      });
  };

  // CODE D'ORIGINE :
  // handleSubmit = (e) => {
  //   e.preventDefault();
  //   console.log(
  //     'e.target.querySelector(`input[data-testid="datepicker"]`).value',
  //     e.target.querySelector(`input[data-testid="datepicker"]`).value
  //   );
  //   const email = JSON.parse(localStorage.getItem("user")).email;
  //   const bill = {
  //     email,
  //     type: e.target.querySelector(`select[data-testid="expense-type"]`).value,
  //     name: e.target.querySelector(`input[data-testid="expense-name"]`).value,
  //     amount: parseInt(
  //       e.target.querySelector(`input[data-testid="amount"]`).value
  //     ),
  //     date: e.target.querySelector(`input[data-testid="datepicker"]`).value,
  //     vat: e.target.querySelector(`input[data-testid="vat"]`).value,
  //     pct:
  //       parseInt(e.target.querySelector(`input[data-testid="pct"]`).value) ||
  //       20,
  //     commentary: e.target.querySelector(`textarea[data-testid="commentary"]`)
  //       .value,
  //     fileUrl: this.fileUrl,
  //     fileName: this.fileName,
  //     status: "pending",
  //   };
  //   this.updateBill(bill);
  //   this.onNavigate(ROUTES_PATH["Bills"]);
  // };

  // no need to cover this function by tests
  updateBill = (bill) => {
    if (this.store) {
      this.store
        .bills()
        .update({ data: JSON.stringify(bill), selector: this.billId })
        .then(() => {
          this.onNavigate(ROUTES_PATH["Bills"]);
        })
        .catch((error) => console.error(error));
    }
  };
}
