import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { db } from "../../../firebase/firebase";
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  writeBatch,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { FileText, GeoAlt, Compass, ChevronDown, ChevronUp, Map } from "react-bootstrap-icons";
import "./terreno_form.css";

const TerrenoForm = () => {
  const { id } = useParams();
  const [terreno, setTerreno] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfrontacoes, setShowConfrontacoes] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTerreno = async () => {
      try {
        const docRef = doc(db, "Terrenos", id.trim());
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTerreno({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.log("Error fetching terreno:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTerreno();
  }, [id]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    const keys = name.split(".");
    setTerreno((prevState) => {
      let newState = { ...prevState };
      let currentPart = newState;
      for (let i = 0; i < keys.length; i++) {
        if (i === keys.length - 1) {
          currentPart[keys[i]] = value;
        } else {
          currentPart[keys[i]] = { ...currentPart[keys[i]] };
          currentPart = currentPart[keys[i]];
        }
      }
      return newState;
    });
  };

  const handleUpdate = async () => {
    try {
      const docRef = doc(db, "Terrenos", id.trim());
      await updateDoc(docRef, terreno);
      toast.success("Informações atualizadas");
    } catch (error) {
      toast.error("Erro ao atualizar informações");
    }
  };

  const handleDelete = async () => {
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

                const [marcosSnap, confrontacoesSnap, fotografiasSnap] = await Promise.all([
                  getDocs(marcosRef),
                  getDocs(confrontacoesRef),
                  getDocs(fotografiasRef),
                ]);

                const batch = writeBatch(db);
                marcosSnap.forEach((d) => batch.delete(d.ref));
                confrontacoesSnap.forEach((d) => batch.delete(d.ref));
                fotografiasSnap.forEach((d) => batch.delete(d.ref));
                await batch.commit();

                await deleteDoc(doc(db, "Terrenos", id.trim()));
                toast.dismiss();
                toast.success("Terreno removido");
                setTimeout(() => navigate("/home"), 1000);
              } catch (error) {
                toast.dismiss();
                toast.error("Erro ao remover terreno");
              }
            }}
          >
            Sim
          </button>
          <button
            style={{ background: "white", color: "#007AFF", padding: "10px 30px", borderRadius: "20px", whiteSpace: "nowrap" }}
            onClick={() => toast.dismiss()}
          >
            Cancelar
          </button>
        </div>
      </div>,
      { position: "top-center", autoClose: false, closeOnClick: false, draggable: false }
    );
  };

  if (loading) {
    return (
      <div className="tv-container">
        <div className="tv-card">
          <div className="tv-loading">
            <span className="tv-spinner" />
            <p>A carregar informações...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tv-container">
      <div className="tv-card">
        {/* Header */}
        <div className="tv-header">
          <div className="tv-header-icon">
            <Map size={30} />
          </div>
          <p>Edite e atualize os dados do terreno</p>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="tv-form">

          {/* Secção: Informações Básicas */}
          <div className="tv-section">
            <div className="tv-section-title">
              <FileText className="tv-section-icon" />
              <span>Informações Básicas</span>
            </div>

            <div className="tv-form-grid">
              <div className="tv-form-group">
                <label className="tv-label">Nome do Terreno</label>
                <input
                  type="text"
                  name="nome"
                  value={terreno?.nome || ""}
                  onChange={handleInputChange}
                  className="tv-input"
                  placeholder="Nome do terreno"
                />
              </div>

              <div className="tv-form-group">
                <label className="tv-label">Matriz</label>
                <input
                  type="text"
                  name="matriz"
                  value={terreno?.matriz || ""}
                  onChange={handleInputChange}
                  className="tv-input"
                  placeholder="Ex: 1234"
                />
              </div>
            </div>
            <br />
            <div className="tv-form-group tv-full-width">
              <label className="tv-label">Descrição</label>
              <input
                type="text"
                name="descricao"
                value={terreno?.descricao || ""}
                onChange={handleInputChange}
                className="tv-input"
                placeholder="Descrição opcional"
              />
            </div>
          </div>

          {/* Secção: Localização */}
          <div className="tv-section">
            <div className="tv-section-title">
              <GeoAlt className="tv-section-icon" />
              <span>Localização</span>
            </div>

            <div className="tv-form-grid">
              <div className="tv-form-group">
                <label className="tv-label">Região</label>
                <input
                  type="text"
                  name="regiao"
                  value={terreno?.regiao || ""}
                  onChange={handleInputChange}
                  className="tv-input"
                  placeholder="Código ou nome da região"
                />
              </div>

              <div className="tv-form-group">
                <label className="tv-label">Freguesia/Distrito</label>
                <input
                  type="text"
                  name="freguesia"
                  value={terreno?.freguesia || ""}
                  onChange={handleInputChange}
                  className="tv-input"
                  placeholder="Freguesia, Distrito"
                />
              </div>

              <div className="tv-form-group">
                <label className="tv-label">Localização do Prédio</label>
                <input
                  type="text"
                  name="localizacaoPredio"
                  value={terreno?.localizacaoPredio || ""}
                  onChange={handleInputChange}
                  className="tv-input"
                  placeholder="Morada ou referência"
                />
              </div>

              <div className="tv-form-group">
                <label className="tv-label">Secção</label>
                <input
                  type="text"
                  name="secao"
                  value={terreno?.secao || ""}
                  onChange={handleInputChange}
                  className="tv-input"
                  placeholder="Secção cadastral"
                />
              </div>
            </div>
          </div>

          {/* Secção: Confrontações (Colapsável) */}
          <div className="tv-section tv-collapsible">
            <button
              type="button"
              className="tv-section-toggle"
              onClick={() => setShowConfrontacoes(!showConfrontacoes)}
            >
              <div className="tv-section-title">
                <Compass className="tv-section-icon" />
                <span>Confrontações</span>
              </div>
              <span className="tv-toggle-icon">
                {showConfrontacoes ? <ChevronUp /> : <ChevronDown />}
              </span>
            </button>

            <div className={`tv-collapsible-content ${showConfrontacoes ? "tv-expanded" : ""}`}>
              <div className="tv-confrontacoes-grid">
                <div className="tv-form-group tv-confrontacao norte">
                  <label className="tv-label">
                    <span className="tv-direction-badge">N</span>
                    Norte
                  </label>
                  <input
                    type="text"
                    name="confrontacao_norte"
                    value={terreno?.confrontacao_norte || ""}
                    onChange={handleInputChange}
                    className="tv-input"
                    placeholder="Confrontação a Norte"
                  />
                </div>

                <div className="tv-form-group tv-confrontacao sul">
                  <label className="tv-label">
                    <span className="tv-direction-badge">S</span>
                    Sul
                  </label>
                  <input
                    type="text"
                    name="confrontacao_sul"
                    value={terreno?.confrontacao_sul || ""}
                    onChange={handleInputChange}
                    className="tv-input"
                    placeholder="Confrontação a Sul"
                  />
                </div>

                <div className="tv-form-group tv-confrontacao nascente">
                  <label className="tv-label">
                    <span className="tv-direction-badge">E</span>
                    Nascente
                  </label>
                  <input
                    type="text"
                    name="confrontacao_nascente"
                    value={terreno?.confrontacao_nascente || ""}
                    onChange={handleInputChange}
                    className="tv-input"
                    placeholder="Confrontação a Nascente"
                  />
                </div>

                <div className="tv-form-group tv-confrontacao poente">
                  <label className="tv-label">
                    <span className="tv-direction-badge">O</span>
                    Poente
                  </label>
                  <input
                    type="text"
                    name="confrontacao_poente"
                    value={terreno?.confrontacao_poente || ""}
                    onChange={handleInputChange}
                    className="tv-input"
                    placeholder="Confrontação a Poente"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer com botões */}
          <div className="tv-footer">
            <button type="button" onClick={handleUpdate} className="tv-btn tv-btn-update">
              Atualizar
            </button>
            <Link to={`/terrenos/${id}/desenho`} className="tv-btn tv-btn-next">
              Seguinte
            </Link>
            <button type="button" onClick={handleDelete} className="tv-btn tv-btn-delete">
              Apagar
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default TerrenoForm;
