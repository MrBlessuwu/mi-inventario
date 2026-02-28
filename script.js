import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDtMQRYTfJfkwoWqTSxXSZJGYo-gKOt-Dg",
  authDomain: "miinventario-51af9.firebaseapp.com",
  projectId: "miinventario-51af9",
  storageBucket: "miinventario-51af9.firebasestorage.app",
  messagingSenderId: "791233911695",
  appId: "1:791233911695:web:030a17ce8e76e5f79849fa"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const invCol = collection(db, "productos");
const entCol = collection(db, "entregas");

// --- NAVEGACIÓN ---
window.showTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
};

// --- GESTIÓN DE BODEGA ---
document.getElementById("form-inventario").addEventListener("submit", async (e) => {
    e.preventDefault();
    await addDoc(invCol, {
        name: document.getElementById("inv-name").value,
        buyPrice: document.getElementById("inv-buy").value,
        sellPrice: document.getElementById("inv-sell").value,
        stock: Number(document.getElementById("inv-stock").value),
        photo: document.getElementById("inv-photo").value
    });
    e.target.reset();
});

// --- GESTIÓN DE ENTREGAS (CON VALIDACIÓN) ---
let productosLocales = []; // Para saber el stock sin consultar mil veces

document.getElementById("form-entrega").addEventListener("submit", async (e) => {
    e.preventDefault();
    const productName = document.getElementById("ent-name").value;
    const qtyPedido = Number(document.getElementById("ent-qty").value);
    
    // Buscar el producto en nuestro inventario
    const prodInventario = productosLocales.find(p => p.name === productName);

    if (!prodInventario || prodInventario.stock < qtyPedido) {
        alert(`❌ ¡ERROR! Solo tienes ${prodInventario ? prodInventario.stock : 0} unidades disponibles de ${productName}`);
        return;
    }

    await addDoc(entCol, {
        name: productName,
        qty: qtyPedido,
        whatsapp: document.getElementById("ent-wa").value,
        place: document.getElementById("ent-place").value,
        time: document.getElementById("ent-time").value,
        sellPrice: prodInventario.sellPrice // Guardamos el precio al que se vendió
    });
    
    e.target.reset();
    alert("✅ Entrega registrada exitosamente");
});

// --- ESCUCHA DE BODEGA ---
onSnapshot(invCol, (snapshot) => {
    const list = document.getElementById("list-inventario");
    const select = document.getElementById("ent-name");
    list.innerHTML = "";
    select.innerHTML = '<option value="">Selecciona un producto...</option>';
    productosLocales = [];

    snapshot.forEach(docSnap => {
        const p = docSnap.data();
        const id = docSnap.id;
        productosLocales.push({...p, id});

        // Llenar lista desplegable de entregas
        select.innerHTML += `<option value="${p.name}">${p.name} (${p.stock} disp.)</option>`;

        // Dibujar tarjeta en bodega
        list.innerHTML += `
            <div class="card verde">
                <div class="card-header">
                    <img src="${p.photo || 'https://via.placeholder.com/100'}" onclick="window.showBigPhoto('${p.photo}')">
                    <div><h2>${p.name}</h2><span>Stock: ${p.stock}</span></div>
                </div>
                <div class="card-actions">
                    <button class="btn-item del" onclick="window.deleteItem('productos','${id}')">🗑️ Borrar</button>
                </div>
            </div>`;
    });
});

// --- ESCUCHA DE ENTREGAS ---
onSnapshot(entCol, (snapshot) => {
    const list = document.getElementById("list-entregas");
    list.innerHTML = "";
    snapshot.forEach(docSnap => {
        const e = docSnap.data();
        const id = docSnap.id;
        const urgency = window.getUrgencyClass ? window.getUrgencyClass(e.time) : 'verde';

        list.innerHTML += `
            <div class="card ${urgency}">
                <div class="card-body" style="padding:15px">
                    <h2>${e.name} (Cant: ${e.qty})</h2>
                    <p>📍 ${e.place}</p>
                    <p>⏰ ${window.formatAMPM ? window.formatAMPM(e.time) : e.time}</p>
                </div>
                <div class="card-actions">
                    <a href="https://wa.me/${e.whatsapp}" class="btn-item wa" target="_blank">💬</a>
                    <button class="btn-item edit" onclick="window.editDelivery('${id}')">📅</button>
                    <button class="btn-item del" onclick="window.deleteItem('entregas','${id}')">🗑️</button>
                </div>
            </div>`;
    });
});

// Funciones Globales
window.deleteItem = async (col, id) => {
    if(confirm("¿Seguro?")) await deleteDoc(doc(db, col, id));
};

window.editDelivery = async (id) => {
    const p = prompt("Nuevo lugar:");
    const t = prompt("Nueva fecha (AAAA-MM-DD HH:MM):");
    if(p || t) await updateDoc(doc(db, "entregas", id), { place: p, time: t });
};

// Reutilizamos tus funciones de formato (asegúrate que estén aquí abajo)
window.formatAMPM = (dateStr) => { /* ... misma de antes ... */ 
    if (!dateStr) return "Sin fecha";
    const date = new Date(dateStr);
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12; hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0'+minutes : minutes;
    return date.toLocaleDateString() + " " + hours + ':' + minutes + ' ' + ampm;
};

window.getUrgencyClass = (dateStr) => { /* ... misma de antes ... */ 
    if (!dateStr) return "verde";
    const dif = (new Date(dateStr) - new Date()) / 3600000;
    if (dif < 0 || dif <= 10) return "rojo";
    if (dif <= 48) return "amarillo";
    return "verde";
};

window.showBigPhoto = (url) => {
    const modal = document.getElementById("photo-modal");
    document.getElementById("modal-img").src = url || 'https://via.placeholder.com/300';
    modal.style.display = "flex";
};


