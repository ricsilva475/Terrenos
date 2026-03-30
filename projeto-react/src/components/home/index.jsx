import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/authContext";
import { db } from "../../firebase/firebase";
import {
  collection,
  getDocs,
  setDoc,
  query,
  where,
  doc,
  deleteDoc,
  writeBatch,
  addDoc,
} from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import "./home.css";
import {
  TrashFill,
  PencilSquare,
  EyeFill,
  Grid3x3GapFill,
  ListUl,
} from "react-bootstrap-icons";
import { toast } from "react-toastify";
import { GeoPoint } from "firebase/firestore";

const Home = () => {
  const { currentUser } = useAuth();
  const [terrenos, setTerrenos] = useState([]);
  const [user, setUser] = useState({});
  const [numTerrenos, setNumTerrenos] = useState(0);
  const [userFields, setUserFields] = useState([]);
  const [view, setView] = useState("mosaic");
  const [filter, setFilter] = useState({
    nome: "",
    area: "",
    freguesia: "",
    confrontacoes: "",
  });
  const [totalArea, setTotalArea] = useState(0);
  const [filteredTerrenos, setFilteredTerrenos] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [totalTerrenos, setTotalTerrenos] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(10);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const [checkedTerrenos, setCheckedTerrenos] = useState({});
  const [userId, setUserId] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const getUserAndFields = async () => {
      const querySnapshot = await getDocs(collection(db, "Proprietario"));
      querySnapshot.forEach(async (docSnap) => {
        if (docSnap.data().email === currentUser.email) {
          setUser(docSnap.data());
          const terrenosSnapshot = await getDocs(
            query(
              collection(db, "Terrenos"),
              where("contribuinte", "==", docSnap.data().contribuinte)
            )
          );
          setNumTerrenos(terrenosSnapshot.size);

          if (docSnap.data().contribuinte) {
            const fieldsQuery = query(
              collection(db, "Terrenos"),
              where("contribuinte", "==", docSnap.data().contribuinte)
            );
            const fieldsSnapshot = await getDocs(fieldsQuery);
            const fieldsData = fieldsSnapshot.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            }));
            setUserFields(fieldsData);

            const total = fieldsData.reduce((sum, f) => sum + (f.area || 0), 0);
            setTotalArea(total);

            const terrenosList = await Promise.all(
              terrenosSnapshot.docs.map(async (d) => ({
                ...d.data(),
                id: d.id,
              }))
            );
            setTerrenos(terrenosList);
          }
        }
      });
    };
    getUserAndFields();
  }, [currentUser]);

  useEffect(() => {
    const filteredFields = userFields.filter((field) => {
      let minArea = -Infinity;
      let maxArea = Infinity;
      if (filter.area) {
        const areaFilter = filter.area.split("-");
        if (areaFilter.length === 2) {
          minArea = Number(areaFilter[0]);
          maxArea = Number(areaFilter[1]);
        } else if (filter.area === "2000+") {
          minArea = 2000;
          maxArea = Infinity;
        }
      }
      return (
        (field.nome ? field.nome.toLowerCase().includes(filter.nome.toLowerCase()) : true) &&
        (field.area !== undefined
          ? field.area >= minArea && field.area <= maxArea
          : filter.area === "") &&
        (field.freguesia ? String(field.freguesia).includes(filter.freguesia) : true) &&
        (field.confrontacoes
          ? JSON.stringify(field.confrontacoes).includes(filter.confrontacoes)
          : true)
      );
    });
    setFilteredTerrenos(filteredFields);
  }, [filter, userFields]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheck = (id) => {
    setCheckedTerrenos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchConfrontacoes = async (terrenoId) => {
    const confrontacoesCollection = collection(db, "Terrenos", terrenoId, "Confrontacoes");
    const snap = await getDocs(confrontacoesCollection);
    return snap.docs.map((d) => ({
      id: d.id,
      entidade: d.data().entidade,
      tipo: d.data().tipo,
      descricao: d.data().descricao,
      marcos: d.data().marcos || [],
    }));
  };

  const fetchMarkers = async (terrenoId) => {
    const ref = collection(db, "Terrenos", terrenoId, "Marcos");
    const snap = await getDocs(ref);
    return snap.docs.map((d, index) => ({
      id: d.id,
      nome: d.data().nome,
      tipo: d.data().tipo,
      descricao: d.data().descricao,
      coordinates: d.data().point || {},
      index: `M${String(index).padStart(2, "0")}`,
    }));
  };

  const fetchVizinhos = async (ProprietarioId) => {
    const ref = collection(db, "Proprietario", ProprietarioId, "Vizinhos");
    const snap = await getDocs(ref);
    return snap.docs.map((d) => ({
      id: d.id,
      nome: d.data().nome,
      confrontacoes: d.data().confrontacoes,
    }));
  };

  useEffect(() => {
    const fetchTerrenos = async () => {
      try {
        const terrenosCollection = collection(db, "Terrenos");
        const terrenosSnapshot = await getDocs(terrenosCollection);
        const terrenosList = terrenosSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        const terrenosWithDetails = await Promise.all(
          terrenosList.map(async (terreno) => {
            const terrenoId = terreno.id;
            const currentUserInfo = currentUser;
            const confrontacoes = await fetchConfrontacoes(terrenoId, currentUserInfo.contribuinte);
            const marcos = await fetchMarkers(terrenoId, currentUserInfo.contribuinte);
            const vizinhos = await fetchVizinhos(terrenoId, currentUserInfo.contribuinte);
            return { ...terreno, confrontacoes, marcos, vizinhos };
          })
        );
        setTerrenos(terrenosWithDetails);
      } catch (error) {}
    };
    fetchTerrenos();
  }, [currentUser]);

  const handleImportClick = async () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".csv, .xml";
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const validFileTypes = ["application/xml", "text/xml"];
      if (!validFileTypes.includes(file.type)) {
        toast.error("Por favor, selecione um ficheiro do tipo .xml");
        return;
      }
      if (file.type === "application/xml" || file.type === "text/xml") {
        await processXMLFile(file);
      }
    };
    fileInput.click();
  };

  const processXMLFile = async (file) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(event.target.result, "application/xml");
      const terrenos = xmlDoc.getElementsByTagName("terreno");
      const terrenosData = [];
      const marcosData = [];
      const confrontacoesData = [];
      for (let i = 0; i < terrenos.length; i++) {
        const terreno = terrenos[i];
        const terrenoId = terreno.getAttribute("number");
        const terrenoData = {
          regiao: terreno.getElementsByTagName("regiao")[0]?.textContent || "",
          secao: terreno.getElementsByTagName("secao")[0]?.textContent || "",
          area: Number(terreno.getElementsByTagName("area")[0]?.textContent) || 0,
          nome: terreno.getElementsByTagName("nome")[0]?.textContent || "",
          matriz: terreno.getElementsByTagName("matriz")[0]?.textContent || "",
          center: new GeoPoint(
            parseFloat(terreno.getElementsByTagName("latitude")[0]?.textContent) || 0,
            parseFloat(terreno.getElementsByTagName("longitude")[0]?.textContent) || 0
          ),
          contribuinte: terreno.getElementsByTagName("contribuinte")[0]?.textContent || "",
          freguesia: terreno.getElementsByTagName("freguesia")[0]?.textContent || "",
          localizacaoPredio: terreno.getElementsByTagName("localizacaoPredio")[0]?.textContent || "",
          perimetro: terreno.getElementsByTagName("perimetro")[0]?.textContent || "",
          descricao: terreno.getElementsByTagName("descricao")[0]?.textContent || "",
        };
        const confrontacoes2 = terreno.getElementsByTagName("confrontacoes")[0];
        terrenoData.confrontacao_norte = confrontacoes2.getElementsByTagName("norte")[0]?.textContent || "";
        terrenoData.confrontacao_sul = confrontacoes2.getElementsByTagName("sul")[0]?.textContent || "";
        terrenoData.confrontacao_nascente = confrontacoes2.getElementsByTagName("nascente")[0]?.textContent || "";
        terrenoData.confrontacao_poente = confrontacoes2.getElementsByTagName("poente")[0]?.textContent || "";
        const marcos = terreno.getElementsByTagName("marco");
        for (let j = 0; j < marcos.length; j++) {
          const marco = marcos[j];
          marcosData.push({
            id: `${terrenoId}-marco-${marco.getAttribute("id")}`,
            tipo: marco.getElementsByTagName("tipo")[0]?.textContent || "",
            descricao: marco.getElementsByTagName("descricao")[0]?.textContent || "",
            coordinates: new GeoPoint(
              parseFloat(marco.getElementsByTagName("latitude")[0]?.textContent) || 0,
              parseFloat(marco.getElementsByTagName("longitude")[0]?.textContent) || 0
            ),
          });
        }
        const confrontacoes = terreno.getElementsByTagName("confrontacao");
        for (let k = 0; k < confrontacoes.length; k++) {
          const confrontacao = confrontacoes[k];
          confrontacoesData.push({
            id: confrontacao.getAttribute("id"),
            entidade: confrontacao.getElementsByTagName("entidade")[0]?.textContent || "",
            nome: confrontacao.getElementsByTagName("nome")[0]?.textContent || "",
            descricao: confrontacao.getElementsByTagName("descricao")[0]?.textContent || "",
          });
        }
        terrenosData.push(terrenoData);
      }
      await saveDataToFirestore(terrenosData, marcosData, confrontacoesData);
    };
    reader.onerror = () => toast.error("Erro ao ler o arquivo");
    reader.readAsText(file);
  };

  const saveDataToFirestore = async (terrenosData, marcosData, confrontacoesData) => {
    try {
      for (const [index, terreno] of terrenosData.entries()) {
        const terrenoId = Math.random().toString(36).substring(2, 15);
        await setDoc(doc(db, "Terrenos", terrenoId), terreno);
        const filteredMarcos = marcosData.filter((m) => m.terrenoId === terreno.id);
        for (const [marcoIndex, marco] of filteredMarcos.entries()) {
          const marcoId = `M${String(marcoIndex).padStart(2, "0")}`;
          await setDoc(doc(db, "Terrenos", terrenoId, "Marcos", marcoId), {
            point: marco.coordinates,
            descricao: marco.descricao,
            tipo: marco.tipo,
          });
        }
        const filteredConfrontacoes = confrontacoesData.filter((c) => c.terrenoId === terreno.id);
        for (const confrontacao of filteredConfrontacoes) {
          await setDoc(doc(db, "Terrenos", terrenoId, "Confrontacoes", confrontacao.id), confrontacao);
        }
        toast.success("Dados importados com sucesso");
        window.location.reload();
      }
    } catch (error) {
      throw error;
    }
  };

  const handleExportClick = async () => {
    const selectedTerrenos = Object.keys(checkedTerrenos).length
      ? sortedTerrenos.filter((t) => checkedTerrenos[t.id])
      : sortedTerrenos;
    toast(
      <div style={{ padding: "20px", fontSize: "20px", width: "100%", maxWidth: "1000px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <button onClick={(e) => { e.stopPropagation(); toast.dismiss(); }} style={{ position: "absolute", top: 4, right: 13, fontSize: "1.2em", backgroundColor: "transparent", border: "none", color: "black" }}>&#x2715;</button>
        <div style={{ fontWeight: "bold", marginBottom: "20px", marginLeft: "-25px" }}>Formatos do Ficheiro</div>
        <div style={{ display: "flex", width: "100%" }}>
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <button style={{ background: "white", color: "#007AFF", padding: "10px 20px", borderRadius: "20px", whiteSpace: "nowrap", marginLeft: "-15px" }} onClick={() => exportAsXML(selectedTerrenos)}>XML</button>
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <button style={{ background: "white", color: "#007AFF", padding: "10px 20px", borderRadius: "20px", whiteSpace: "nowrap", marginLeft: "-15px" }} onClick={() => exportAsCSV(selectedTerrenos)}>CSV</button>
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <button style={{ background: "white", color: "#007AFF", padding: "10px 20px", borderRadius: "20px", whiteSpace: "nowrap", marginLeft: "-15px" }} onClick={() => exportAsPDF(selectedTerrenos)}>PDF</button>
          </div>
        </div>
      </div>,
      { position: "top-center", autoClose: false, hideProgressBar: true, closeOnClick: false, draggable: false, closeButton: false }
    );
  };

  const exportAsXML = async () => {
    const selectedTerrenos = terrenos.filter((t) => checkedTerrenos[t.id]);
    const terrenosParaExportar = selectedTerrenos.length > 0 ? selectedTerrenos : terrenos;
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<terrenos>\n';
    for (let index = 0; index < terrenosParaExportar.length; index++) {
      const terreno = terrenosParaExportar[index];
      xml += `  <terreno number="${index + 1}">\n`;
      xml += `    <confrontacoes>\n      <norte>${terreno.confrontacao_norte || ""}</norte>\n      <sul>${terreno.confrontacao_sul || ""}</sul>\n      <nascente>${terreno.confrontacao_nascente || ""}</nascente>\n      <poente>${terreno.confrontacao_poente || ""}</poente>\n    </confrontacoes>\n`;
      for (let key in terreno) {
        if (terreno[key] !== null && terreno[key] !== undefined) {
          if (key === "center") {
            xml += `    <${key}>\n      <latitude>${terreno[key].latitude || ""}</latitude>\n      <longitude>${terreno[key].longitude || ""}</longitude>\n    </${key}>\n`;
          } else if (key === "confrontacoes" && Array.isArray(terreno[key])) {
            xml += `    <${key}>\n`;
            for (let c of terreno[key]) {
              if (c.id) {
                const details = await fetchConfrontacoes(c.id);
                const nome = details.nomeVizinho;
                xml += `      <confrontacao id="${c.id}">\n        <entidade>${c.entidade || ""}</entidade>\n        <nome>${c.entidade === "pessoa" ? nome || "" : c.nome || ""}</nome>\n        <descricao>${c.descricao || ""}</descricao>\n      </confrontacao>\n`;
              }
            }
            xml += `    </${key}>\n`;
          } else if (key === "marcos" && Array.isArray(terreno[key])) {
            xml += `    <${key}>\n`;
            for (let m of terreno[key]) {
              xml += `      <marco id="${m.index}">\n        <tipo>${m.tipo || ""}</tipo>\n        <descricao>${m.descricao || ""}</descricao>\n        <coordinates>\n          <latitude>${m.coordinates.latitude || ""}</latitude>\n          <longitude>${m.coordinates.longitude || ""}</longitude>\n        </coordinates>\n      </marco>\n`;
            }
            xml += `    </${key}>\n`;
          } else if (key !== "id") {
            xml += `    <${key}>${terreno[key]}</${key}>\n`;
          }
        }
      }
      xml += `  </terreno>\n`;
    }
    xml += "</terrenos>";
    const blob = new Blob([xml], { type: "application/xml" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "terrenos.xml";
    link.click();
    URL.revokeObjectURL(href);
  };

  const exportAsCSV = async () => {
    const selectedTerrenos = terrenos.filter((t) => checkedTerrenos[t.id]);
    const terrenosParaExportar = selectedTerrenos.length > 0 ? selectedTerrenos : terrenos;
    let csv = "id,center_latitude,center_longitude,confrontacoes_norte,confrontacoes_sul,confrontacoes_nascente,confrontacoes_poente";
    for (let key in terrenosParaExportar[0]) {
      if (key !== "center" && key !== "confrontacoes" && key !== "marcos") csv += `,${key}`;
    }
    csv += "\n";
    for (let terreno of terrenosParaExportar) {
      csv += `${terreno.id},${terreno.center?.latitude || ""},${terreno.center?.longitude || ""},`;
      csv += `${terreno.confrontacoes?.norte || ""},${terreno.confrontacoes?.sul || ""},`;
      csv += `${terreno.confrontacoes?.nascente || ""},${terreno.confrontacoes?.poente || ""}`;
      for (let key in terreno) {
        if (key !== "center" && key !== "confrontacoes" && key !== "marcos") {
          csv += `,${terreno[key] !== undefined ? terreno[key] : ""}`;
        }
      }
      if (terreno.confrontacoes && Array.isArray(terreno.confrontacoes)) {
        for (let c of terreno.confrontacoes) {
          if (c.id) {
            const details = await fetchConfrontacoes(c.id);
            csv += `,${c.id || ""},${c.entidade || ""},${details.nomeVizinho || c.nome || ""},${c.descricao || ""}`;
          }
        }
      }
      if (terreno.marcos && Array.isArray(terreno.marcos)) {
        for (let m of terreno.marcos) {
          csv += `,${m.index || ""},${m.tipo || ""},${m.descricao || ""},${m.coordinates?.latitude || ""},${m.coordinates?.longitude || ""}`;
        }
      }
      csv += "\n";
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "terrenos.csv";
    link.click();
    URL.revokeObjectURL(href);
  };

  const exportAsPDF = (terrenos) => {
    const { jsPDF } = window.jspdf;
    const docPdf = new jsPDF();
    const img = new Image();
    img.src = "logotipo.jpg";
    terrenos.forEach((terreno, index) => {
      if (index > 0) docPdf.addPage();
      docPdf.setFontSize(14);
      docPdf.setTextColor(0, 0, 0);
      const pageWidth = docPdf.internal.pageSize.getWidth();
      const title = "GTR - Gestão Terrenos Rústicos";
      const titleWidth = docPdf.getTextWidth(title);
      docPdf.text(title, pageWidth - 15, 20, { align: "right" });
      const underlineY = 25;
      docPdf.line(pageWidth - 15 - titleWidth, underlineY, pageWidth - 15, underlineY);
      docPdf.addImage(img, 7, 10, 60, 37);
      docPdf.setFontSize(20);
      const text = `Terreno ${index + 1}`;
      const textSize = docPdf.getTextWidth(text);
      docPdf.text(text, (pageWidth - textSize) / 2, 50);
      const rows = [];
      const capitalizeFirstLetter = (s) => s.charAt(0).toUpperCase() + s.slice(1);
      const keyMapping = {
        area: "Área", regiao: "Região", perimetro: "Perímetro", secao: "Secção",
        nome: "Nome do Terreno", localizacaoPredio: "Localização Prédio",
        descricao: "Descrição", confrontacao_norte: "Confrontação - Norte",
        confrontacao_sul: "Confrontação - Sul", confrontacao_nascente: "Confrontação - Nascente",
        confrontacao_poente: "Confrontação - Poente",
      };
      for (let key in terreno) {
        if (terreno[key] !== null && terreno[key] !== undefined && key !== "id") {
          let value = terreno[key];
          if (key === "area") value = `${value} m²`;
          else if (key === "perimetro") value = `${value} m`;
          if (key === "center") {
            rows.push(["Centro do Terreno (latitude)", terreno[key].latitude || ""]);
            rows.push(["Centro do Terreno (longitude)", terreno[key].longitude || ""]);
          } else if (key === "confrontacoes") {
            rows.push(["Confrontação - Norte", terreno[key].norte || ""]);
            rows.push(["Confrontação - Sul", terreno[key].sul || ""]);
            rows.push(["Confrontação - Nascente", terreno[key].nascente || ""]);
            rows.push(["Confrontação - Poente", terreno[key].poente || ""]);
          } else {
            rows.push([keyMapping[key] || capitalizeFirstLetter(key), value]);
          }
        }
      }
      rows.sort((a, b) => a[0].localeCompare(b[0]));
      docPdf.autoTable({ startY: 60, head: [["Campos", "Valores"]], body: rows });
    });
    docPdf.save("terrenos.pdf");
  };

  const handleRedirectToTerrenoView = (terrenoId) => navigate(`/terrenos/${terrenoId}`);
  const handleViewDetails = (terrenoId) => navigate(`/dashboard/terrenos/${terrenoId}`);

  const sortedTerrenos = React.useMemo(() => {
    if (sortConfig.key !== null) {
      return [...filteredTerrenos].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return filteredTerrenos;
  }, [filteredTerrenos, sortConfig]);

  useEffect(() => setTotalTerrenos(filteredTerrenos.length), [filteredTerrenos]);

  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;

  const handleDelete = async (id) => {
    toast(
      <div style={{ padding: "20px", fontSize: "20px", width: "auto", maxWidth: "90vw" }}>
        Deseja mesmo eliminar o terreno?
        <div style={{ display: "flex", justifyContent: "space-around", marginTop: "20px" }}>
          <button
            style={{ background: "white", color: "#007AFF", padding: "10px 20px", borderRadius: "20px", whiteSpace: "nowrap" }}
            onClick={async () => {
              try {
                const marcosRef = collection(db, "Terrenos", id.trim(), "Marcos");
                const confrontacoesRef = collection(db, "Terrenos", id.trim(), "Confrontacoes");
                const fotografiasRef = collection(db, "Terrenos", id.trim(), "Fotografias");
                const [mSnap, cSnap, fSnap] = await Promise.all([getDocs(marcosRef), getDocs(confrontacoesRef), getDocs(fotografiasRef)]);
                const batch = writeBatch(db);
                mSnap.forEach((d) => batch.delete(d.ref));
                cSnap.forEach((d) => batch.delete(d.ref));
                fSnap.forEach((d) => batch.delete(d.ref));
                await batch.commit();
                await deleteDoc(doc(db, "Terrenos", id.trim()));
                const updated = terrenos.filter((t) => t.id !== id).filter((t) => t.userId === userId);
                setTerrenos(updated);
                setUserFields(updated);
                setFilteredTerrenos(updated);
                toast.dismiss();
                toast.success("Terreno removido");
                window.location.reload();
              } catch (error) {
                toast.dismiss();
                toast.error("Erro ao remover terreno");
              }
            }}
          >Sim</button>
          <button style={{ background: "white", color: "#007AFF", padding: "10px 30px", borderRadius: "20px", whiteSpace: "nowrap" }} onClick={() => toast.dismiss()}>Cancelar</button>
        </div>
      </div>,
      { position: "top-center", autoClose: false, closeOnClick: false, draggable: false, pauseOnHover: false }
    );
  };

  /* ── Sub-components ── */

  const MosaicView = () => (
    <div className="card-grid">
      {filteredTerrenos.length > 0 ? (
        filteredTerrenos.map((field) => (
          <Link to={`/terrenos/${field.id}`} key={field.id} className="card-link">
            <div className="card">
              <img src="/terreno.jpg" alt="Imagem do terreno" className="card-image" />
              <div className="card-content">
                <strong>Nome:</strong> {field.nome}
                <br />
                <strong>Freguesia:</strong> {field.freguesia}
                <br />
                <strong>Área:</strong> {field.area ? `${field.area} m²` : "Sem área definida"}
              </div>
            </div>
          </Link>
        ))
      ) : (
  <div className="empty-state">
    <h3 className="empty-state-title">Nenhum terreno registado</h3>
    <p className="empty-state-sub">Ainda não tem terrenos na sua conta. Adicione o seu primeiro terreno para começar.</p>
    <Link to="/terrenos" className="btn-action btn-action-primary">
      + Adicionar terreno
    </Link>
  </div>
)}
    </div>
  );

  const ListView = () => (
    <div className="list-view-wrapper">
      <div className="list-view-header">
        <h2 className="list-view-title">
          Lista de terrenos
          <span className="count-badge">{totalTerrenos}</span>
        </h2>
        <div className="list-view-actions">
          <button className="btn-action btn-action-ghost" onClick={handleImportClick}>
            ↑ Importar
          </button>
          <button className="btn-action btn-action-primary" onClick={handleExportClick}>
            ↓ Exportar
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="project-list-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Área</th>
              <th>Freguesia</th>
              <th>Matriz</th>
              <th>Ação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedTerrenos.map((terreno) => (
              <tr key={terreno.id}>
                <td>{terreno.nome}</td>
                <td>{terreno.area ? `${terreno.area} m²` : "—"}</td>
                <td>{terreno.freguesia || "—"}</td>
                <td>{terreno.matriz || "—"}</td>
                <td>
                  <div className="table-actions-cell">
                    <button className="table-btn table-btn-view" title="Ver detalhes" onClick={() => handleViewDetails(terreno.id)}>
                      <EyeFill />
                    </button>
                    <button className="table-btn table-btn-edit" title="Editar" onClick={() => handleRedirectToTerrenoView(terreno.id)}>
                      <PencilSquare />
                    </button>
                    <button className="table-btn table-btn-delete" title="Eliminar" onClick={() => handleDelete(terreno.id)}>
                      <TrashFill />
                    </button>
                  </div>
                </td>
                <td>
                  <input type="checkbox" checked={checkedTerrenos[terreno.id] || false} onChange={() => handleCheck(terreno.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination-bar">
        <span className="pagination-info">
          Mostrando {indexOfFirstEntry + 1}–{Math.min(indexOfLastEntry, totalTerrenos)} de {totalTerrenos} terrenos
        </span>
        <ul className="pagination">
          <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
            <button className="page-link" onClick={() => paginate(currentPage - 1)}>‹</button>
          </li>
        </ul>
      </div>
    </div>
  );

  /* ── Render ── */
  return (
    <div className="home-wrapper">
      {/* Hero */}
      <div className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-text">
            <h1>Bem-vindo, {user.name || "—"}</h1>
            <p>Faça aqui a gestão de todas as suas propriedades</p>
          </div>
          <div className="home-stats">
            <div className="stat-pill">
              <span className="stat-pill-icon">🗺️</span>
              <div className="stat-pill-info">
                <span className="stat-pill-value">{numTerrenos}</span>
                <span className="stat-pill-label">Terrenos</span>
              </div>
            </div>
            <div className="stat-pill">
              <span className="stat-pill-icon">✏️</span>
              <div className="stat-pill-info">
                <span className="stat-pill-value">{totalArea.toLocaleString("pt-PT")} m²</span>
                <span className="stat-pill-label">Área Total</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="home-content">
        {/* Toolbar */}
        <div className="home-toolbar">
          <div className="home-toolbar-left">
            <input
              type="text"
              name="nome"
              value={filter.nome}
              onChange={handleFilterChange}
              placeholder="Filtrar por nome…"
              className="filter-input"
            />
            <select name="area" value={filter.area} onChange={handleFilterChange} className="filter-select">
              <option value="">Filtrar por área…</option>
              <option value="0-100">0 – 100 m²</option>
              <option value="100-500">100 – 500 m²</option>
              <option value="500-1000">500 – 1000 m²</option>
              <option value="1000-2000">1000 – 2000 m²</option>
              <option value="2000+">+2000 m²</option>
            </select>
            <input
              type="text"
              name="freguesia"
              value={filter.freguesia}
              onChange={handleFilterChange}
              placeholder="Filtrar por freguesia…"
              className="filter-input"
            />
          </div>
        </div>

        {/* View */}
        <div className="section-label">
          {/*<h2>
            {view === "mosaic" ? "Mosaico" : "Lista"}
            <span className="count-badge">{filteredTerrenos.length}</span>
          </h2>*/}
        </div>

        {view === "mosaic" ? <MosaicView /> : <ListView />}
      </div>
    </div>
  );
};

export default Home;
