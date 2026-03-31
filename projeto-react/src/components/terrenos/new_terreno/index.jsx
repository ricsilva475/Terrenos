import React, { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/authContext";
import { db } from "../../../firebase/firebase";
import { collection, addDoc, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import firebase from "firebase/compat/app";
import { QuestionCircleFill, ChevronDown, ChevronUp, GeoAlt, Map, FileText, Compass } from 'react-bootstrap-icons';
import { Modal } from 'react-bootstrap';
import "./AddTerreno.css";

const AddTerreno = () => {
  const { currentUser } = useAuth();
  const apiKey = process.env.REACT_APP_GOOGLE_API_KEY;
  const [user, setUser] = useState({});
  const [userId, setUserId] = useState(null);
  const [codigoRegiao, setCodigoRegiao] = useState('');
  const navigate = useNavigate();
  const [showConfrontacoes, setShowConfrontacoes] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [freguesia, setFreguesia] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [terreno, setTerreno] = useState({
    nome: "",
    descricao: null,
    freguesia: "",
    localizacaoPredio: "",
    matriz: "",
    regiao: "",
    secao: "",
    confrontacao_norte: "",
    confrontacao_sul: "",
    confrontacao_nascente: "",
    confrontacao_poente: "",
  });

  useEffect(() => {
    const getUser = async () => {
      const querySnapshot = await getDocs(collection(db, "Proprietario"));
      querySnapshot.forEach((doc) => {
        if (doc.data().email === currentUser.email) {
          setUser(doc.data());
          setUserId(doc.id);
        }
      });
    };
    getUser();
  }, [currentUser]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setTerreno({
      ...terreno,
      [name]: value,
    });
    if (name === 'regiao') {
      setCodigoRegiao(value);
    }
  };

  const handleChangeFreguesia = (value) => {
    setTerreno((prev) => ({ ...prev, freguesia: value }));
  };

  const handleInputChange = (value) => {
    setInputValue(value);
    if (!value) {
      setTerreno((prev) => ({ ...prev, freguesia: null }));
    }
  };

  const handleConfrontacoesChange = (event, direction) => {
    const { value } = event.target;
    const directionKey = `confrontacao_${direction}`;
    setTerreno({
      ...terreno,
      [directionKey]: value,
    });
  };

  const checkIfMatrizExists = async (matriz) => {
    try {
      const user = firebase.auth().currentUser;
      const terrenosCollection = collection(db, "Terrenos");
      const matrizQuery = query(terrenosCollection, where("matriz", "==", matriz), where("contribuinte", "==", user.contribuinte));
      const querySnapshot = await getDocs(matrizQuery);
      return querySnapshot.size > 0;
    } catch (error) {
      return false;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
  
    if (terreno.matriz.length !== 4 || terreno.matriz === '0000' || isNaN(terreno.matriz) || terreno.matriz < 0) {
      toast.error("A matriz deve ser um número de 4 dígitos diferente de 0000");
      setIsLoading(false);
      return;
    }
  
    try {
      const matrizExists = await checkIfMatrizExists(terreno.matriz);
      if (matrizExists) {
        toast.error("Já existe um terreno registrado com esta matriz!");
        setIsLoading(false);
        return;
      }
    } catch (error) {
      toast.error("Erro ao verificar a existência da matriz. Tente novamente.");
      setIsLoading(false);
      return;
    }
  
    const requiredFields = ['nome', 'freguesia', 'matriz'];
    for (let field of requiredFields) {
      if (!terreno[field]) {
        toast.info("Faltam preencher campos obrigatórios");
        setIsLoading(false);
        return;
      }
    }
  
    try {
      const docRef = await addDoc(collection(db, "Terrenos"), {
        ...terreno,
        contribuinte: user.contribuinte,
      });
  
      navigate(`/terrenos/${docRef.id}/desenho/poligono`);
  
      setTerreno({
        nome: "",
        descricao: null,
        freguesia: "",
        localizacaoPredio: "",
        matriz: "",
        regiao: "",
        secao: "",
        confrontacao_norte: "",
        confrontacao_sul: "",
        confrontacao_nascente: "",
        confrontacao_poente: "",
      });
  
      toast.success("Terreno adicionado com sucesso");
    } catch (error) {
      toast.error("Erro ao adicionar terreno. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const getFreguesia = async (event) => {
    event.preventDefault();
    try {
      if (!codigoRegiao) {
        toast.error('Por favor, insira um código de região válido');
        return;
      }
  
      const docRef = doc(db, 'DICOFRE', codigoRegiao);
      const docSnap = await getDoc(docRef);
  
      if (docSnap.exists()) {
        const dados = docSnap.data();
        const nomeFreguesia = dados.FREGUESIA;
        const nomeDistrito = dados.DISTRITO;
        const nomeCompleto = `${nomeFreguesia}, ${nomeDistrito}`;
        terreno.freguesia = nomeCompleto;
        setFreguesia(nomeCompleto);
      } else {
        toast.error('Código de região inválido');
      }
    } catch (error) {
      toast.error('Erro ao buscar dados da freguesia');
    }
  };

  return (
    <div className="add-terreno-container">
      <div className="add-terreno-card">
        {/* Header */}
        <div className="form-header">
          <div className="header-icon">
            <Map size={30} />
          </div>
          <h1>Novo Terreno</h1>
          <p>Preencha as informações do seu terreno</p>
        </div>

        <form onSubmit={handleSubmit} className="add-terreno-form">
          {/* Secção: Informações Básicas */}
          <div className="form-section">
            <div className="section-title">
              <FileText className="section-icon" />
              <span>Informações Básicas</span>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  Nome do Terreno
                  <span className="required-badge">Obrigatório</span>
                </label>
                <input
                  type="text"
                  name="nome"
                  value={terreno.nome}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Ex: Terreno da Quinta"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Matriz
                  <span className="required-badge">Obrigatório</span>
                </label>
                <input
                  type="text"
                  name="matriz"
                  value={terreno.matriz}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Ex: 1234"
                  maxLength={4}
                />
              </div>
            </div>
            <br />
            <div className="form-group full-width">
              <label className="form-label">Descrição</label>
              <textarea
                name="descricao"
                value={terreno.descricao || ""}
                onChange={handleChange}
                className="form-input form-textarea"
                placeholder="Adicione uma descrição opcional..."
                rows={3}
              />
            </div>
          </div>

          {/* Secção: Localização */}
          <div className="form-section">
            <div className="section-title">
              <GeoAlt className="section-icon" />
              <span>Localização</span>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  Código da Região
                  <button 
                    type="button" 
                    className="help-button" 
                    onClick={() => setShowHelp(true)}
                    title="Como preencher"
                  >
                    <QuestionCircleFill />
                  </button>
                </label>
                <div className="input-with-button">
                  <input
                    type="text"
                    name="regiao"
                    value={terreno.regiao}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Ex: 100919"
                  />
                  
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Freguesia/Distrito
                  <span className="required-badge">Obrigatório</span>
                </label>
                <input
                  type="text"
                  name="freguesia"
                  value={terreno.freguesia}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Freguesia, Distrito"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Localização do Prédio</label>
                <input
                  type="text"
                  name="localizacaoPredio"
                  value={terreno.localizacaoPredio}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Morada ou referência"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Secção</label>
                <input
                  type="text"
                  name="secao"
                  value={terreno.secao}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Secção cadastral"
                />
              </div>
            </div>
          </div>

          {/* Secção: Confrontações (Colapsável) */}
          <div className="form-section collapsible">
            <button 
              type="button"
              className="section-toggle"
              onClick={() => setShowConfrontacoes(!showConfrontacoes)}
            >
              <div className="section-title">
                <Compass className="section-icon" />
                <span>Confrontações</span>
              </div>
              <span className="toggle-icon">
                {showConfrontacoes ? <ChevronUp /> : <ChevronDown />}
              </span>
            </button>

            <div className={`collapsible-content ${showConfrontacoes ? 'expanded' : ''}`}>
              <div className="confrontacoes-grid">
                <div className="form-group confrontacao-item norte">
                  <label className="form-label">
                    <span className="direction-indicator">N</span>
                    Norte
                  </label>
                  <input
                    type="text"
                    value={terreno.confrontacao_norte || ""}
                    onChange={(e) => handleConfrontacoesChange(e, "norte")}
                    className="form-input"
                    placeholder="Confrontação a Norte"
                  />
                </div>

                <div className="form-group confrontacao-item sul">
                  <label className="form-label">
                    <span className="direction-indicator">S</span>
                    Sul
                  </label>
                  <input
                    type="text"
                    value={terreno.confrontacao_sul || ""}
                    onChange={(e) => handleConfrontacoesChange(e, "sul")}
                    className="form-input"
                    placeholder="Confrontação a Sul"
                  />
                </div>

                <div className="form-group confrontacao-item nascente">
                  <label className="form-label">
                    <span className="direction-indicator">E</span>
                    Nascente
                  </label>
                  <input
                    type="text"
                    value={terreno.confrontacao_nascente || ""}
                    onChange={(e) => handleConfrontacoesChange(e, "nascente")}
                    className="form-input"
                    placeholder="Confrontação a Nascente"
                  />
                </div>

                <div className="form-group confrontacao-item poente">
                  <label className="form-label">
                    <span className="direction-indicator">O</span>
                    Poente
                  </label>
                  <input
                    type="text"
                    value={terreno.confrontacao_poente || ""}
                    onChange={(e) => handleConfrontacoesChange(e, "poente")}
                    className="form-input"
                    placeholder="Confrontação a Poente"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="form-footer">
            <button 
              type="submit" 
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  A processar...
                </>
              ) : (
                <>
                  Seguinte
                  <ChevronDown className="btn-icon rotate-270" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Ajuda */}
      <Modal show={showHelp} onHide={() => setShowHelp(false)} centered className="help-modal">
        <Modal.Header closeButton>
          <Modal.Title>Como preencher o código</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <img src="/Codigos.png" alt="Códigos de região" className="help-image" />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default AddTerreno;
