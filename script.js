import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let productosLocales = [];

// --- NAVEGACIÓN ---
window.showTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
};

// --- BODEGA ---
document.getElementById("form-inventario").addEventListener("submit", async (e) => {
    e.preventDefault();
    await addDoc(invCol, {
        name: document.getElementById("inv-name").value,
        buyPrice: Number(document.getElementById("inv-buy").value),
        sellPrice: Number(document.getElementById("inv-sell").value),
        stock: Number(document.getElementById("inv-stock").value),
        photo: document.getElementById("inv-photo").value
    });
    e.target.reset();
});

// --- ENTREGAS (MÚLTIPLES PRODUCTOS) ---
document.getElementById("form-entrega").addEventListener("submit", async (e) => {
    e.preventDefault();
    const selects = document.querySelectorAll(".ent-name-select");
    const inputs = document.querySelectorAll(".ent-qty-input");
    
    let itemsPedidos = [];
    let granTotal = 0;

    for (let i = 0; i < selects.length; i++) {
        const name = selects[i].value;
        const qty = Number(inputs[i].value);
        if (name && qty > 0) {
            const prod = productosLocales.find(p => p.name === name);
            if (prod.stock < qty) {
                alert(`❌ No hay suficiente stock de ${name}. Disponible: ${prod.stock}`);
                return;
            }
            itemsPedidos.push({ name, qty, unitPrice: prod.sellPrice, subtotal: qty * prod.sellPrice });
            granTotal += qty * prod.sellPrice;
        }
    }

    await addDoc(entCol, {
        items: itemsPedidos,
        total: granTotal,
        whatsapp: document.getElementById("ent-wa").value,
        place: document.getElementById("ent-place").value,
        time: document.getElementById("ent-time").value
    });
    e.target.reset();
});

// --- RENDERIZADO BODEGA ---
onSnapshot(invCol, (snapshot) => {
    const list = document.getElementById("list-inventario");
    const selects = document.querySelectorAll(".ent-name-select");
    list.innerHTML = "";
    productosLocales = [];

    // Limpiar selects
    selects.forEach(s => s.innerHTML = '<option value="">Producto...</option>');

    snapshot.forEach(docSnap => {
        const p = docSnap.data();
        const id = docSnap.id;
        productosLocales.push({...p, id});

        selects.forEach(s => s.innerHTML += `<option value="${p.name}">${p.name}</option>`);

        list.innerHTML += `
            <div class="card verde">
                <div class="card-header">
                    <img src="${p.photo || 'https://via.placeholder.com/100'}" onclick="window.showBigPhoto('${p.photo}')">
                    <div>
                        <h2>${p.name}</h2>
                        <span class="price-tag">Compra: Q${p.buyPrice} | Venta: Q${p.sellPrice}</span>
                    </div>
                </div>
                <div class="card-body" style="padding:10px 15px">
                   <strong>Stock: ${p.stock} unidades</strong>
                </div>
                <div class="card-actions">
                    <button class="btn-item edit" onclick="window.updateStock('${id}', ${p.stock})">✏️ Stock</button>
                    <button class="btn-item del" onclick="window.deleteItem('productos','${id}')">🗑️</button>
                </div>
            </div>`;
    });
});

// --- RENDERIZADO ENTREGAS ---
onSnapshot(entCol, (snapshot) => {
    const list = document.getElementById("list-entregas");
    list.innerHTML = "";
    snapshot.forEach(docSnap => {
        const e = docSnap.data();
        const id = docSnap.id;
        const urgency = window.getUrgencyClass(e.time);

        let itemsHTML = e.items.map(i => `• ${i.qty} x ${i.name} (Q${i.unitPrice} c/u)` ).join("<br>");

        list.innerHTML += `
            <div class="card ${urgency}">
                <div class="card-body" style="padding:15px">
                    <div style="margin-bottom:10px">${itemsHTML}</div>
                    <span class="total-pay">TOTAL A COBRAR: Q${e.total}</span>
                    <p>📍 ${e.place}</p>
                    <p>⏰ ${window.formatAMPM(e.time)}</p>
                </div>
                <div class="card-actions">
                    <a href="https://wa.me/${e.whatsapp}" class="btn-item wa" target="_blank">💬</a>
                    <button class="btn-item del" onclick="window.deleteItem('entregas','${id}')">🗑️</button>
                </div>
            </div>`;
    });
});

// --- FUNCIONES AUXILIARES ---
window.updateStock = async (id, oldStock) => {
    const nuevo = prompt("Nuevo stock total:", oldStock);
    if (nuevo !== null) await updateDoc(doc(db, "productos", id), { stock: Number(nuevo) });
};

window.deleteItem = async (col, id) => {
    if(confirm("¿Seguro de borrar?")) await deleteDoc(doc(db, col, id));
};

window.formatAMPM = (dateStr) => {
    if (!dateStr) return "Sin fecha";
    const date = new Date(dateStr);
    return date.toLocaleDateString() + " " + date.getHours() % 12 + ":" + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes() + (date.getHours() >= 12 ? ' PM' : ' AM');
};

window.getUrgencyClass = (dateStr) => {
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



