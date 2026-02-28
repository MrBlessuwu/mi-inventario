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
const showTab = (tabName) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    if(tabName === 'inv') {
        document.getElementById('tab-inventario').classList.add('active');
        document.getElementById('btn-tab-inv').classList.add('active');
    } else {
        document.getElementById('tab-entregas').classList.add('active');
        document.getElementById('btn-tab-ent').classList.add('active');
    }
};

document.getElementById('btn-tab-inv').addEventListener('click', () => showTab('inv'));
document.getElementById('btn-tab-ent').addEventListener('click', () => showTab('ent'));

// --- GESTIÓN DE BODEGA ---
document.getElementById("form-inventario").addEventListener("submit", async (e) => {
    e.preventDefault();
    await addDoc(invCol, {
        name: document.getElementById("inv-name").value,
        buyPrice: Number(document.getElementById("inv-buy").value),
        sellPrice: Number(document.getElementById("inv-sell").value),
        stock: Number(document.getElementById("inv-stock").value),
        photo: document.getElementById("inv-photo").value,
        visible: document.getElementById("inv-visible").checked // Guarda si es visible
    });
    e.target.reset();
    alert("Producto guardado ✨");
});

// --- GESTIÓN DE ENTREGAS ---
document.getElementById("form-entrega").addEventListener("submit", async (e) => {
    e.preventDefault();
    const selects = document.querySelectorAll(".ent-name-select");
    const inputs = document.querySelectorAll(".ent-qty-input");
    
    let itemsPedidos = [];
    let granTotal = 0;
    let actualizacionesStock = [];

    for (let i = 0; i < selects.length; i++) {
        const name = selects[i].value;
        const qty = Number(inputs[i].value);
        if (name && qty > 0) {
            const prod = productosLocales.find(p => p.name === name);
            if (!prod || prod.stock < qty) {
                alert(`❌ Stock insuficiente de ${name}. Disponible: ${prod ? prod.stock : 0}`);
                return;
            }
            itemsPedidos.push({ name, qty, unitPrice: prod.sellPrice });
            granTotal += (qty * prod.sellPrice);
            actualizacionesStock.push({ id: prod.id, nuevoStock: prod.stock - qty });
        }
    }

    if (itemsPedidos.length === 0) return alert("Agrega al menos un producto");

    try {
        await addDoc(entCol, {
            items: itemsPedidos,
            total: granTotal,
            whatsapp: document.getElementById("ent-wa").value,
            place: document.getElementById("ent-place").value,
            time: document.getElementById("ent-time").value
        });

        for (const act of actualizacionesStock) {
            await updateDoc(doc(db, "productos", act.id), { stock: act.nuevoStock });
        }

        e.target.reset();
        alert("✅ Pedido creado y stock descontado.");
    } catch (err) { console.error(err); }
});

// --- RENDERIZADO BODEGA ---
onSnapshot(invCol, (snapshot) => {
    const list = document.getElementById("list-inventario");
    const selects = document.querySelectorAll(".ent-name-select");
    list.innerHTML = "";
    productosLocales = [];
    
    let options = '<option value="">Producto...</option>';
    snapshot.forEach(docSnap => {
        const p = docSnap.data();
        const id = docSnap.id;
        productosLocales.push({...p, id});
        options += `<option value="${p.name}">${p.name} (Disp: ${p.stock})</option>`;

        const estadoCat = p.visible !== false ? "👁️ En Catálogo" : "🚫 Oculto";

        list.innerHTML += `
            <div class="card verde">
                <div class="card-header">
                    <img src="${p.photo || 'https://via.placeholder.com/100'}" onclick="window.showBigPhoto('${p.photo}')">
                    <div>
                        <h2>${p.name}</h2>
                        <span class="price-tag">Venta: Q${p.sellPrice} | Stock: ${p.stock}</span><br>
                        <small style="color: #666;">${estadoCat}</small>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn-item edit" onclick="window.updateStock('${id}', ${p.stock})">✏️</button>
                    <button class="btn-item del" onclick="window.deleteItem('productos','${id}')">🗑️</button>
                </div>
            </div>`;
    });
    selects.forEach(s => s.innerHTML = options);
});

// --- RENDERIZADO ENTREGAS ---
onSnapshot(entCol, (snapshot) => {
    const list = document.getElementById("list-entregas");
    list.innerHTML = "";
    snapshot.forEach(docSnap => {
        const e = docSnap.data();
        const id = docSnap.id;
        const urgency = window.getUrgencyClass(e.time);
        let itemsHTML = e.items.map(i => `• ${i.qty} x ${i.name}`).join("<br>");

        list.innerHTML += `
            <div class="card ${urgency}">
                <div class="card-body" style="padding:15px">
                    <div style="font-weight:bold">${itemsHTML}</div>
                    <span class="total-pay">TOTAL: Q${e.total}</span>
                    <p>📍 ${e.place || 'Sin lugar'}</p>
                    <p>⏰ ${window.formatAMPM(e.time)}</p>
                </div>
                <div class="card-actions">
                    <a href="https://wa.me/${e.whatsapp}" class="btn-item wa" target="_blank">💬</a>
                    <button class="btn-item edit" onclick="window.editDelivery('${id}')">📅</button>
                    <button class="btn-item del" onclick="window.deleteItem('entregas','${id}')">🗑️</button>
                </div>
            </div>`;
    });
});

// --- FUNCIONES GLOBALES ---
window.updateStock = async (id, oldStock) => {
    const nuevo = prompt("Corregir Stock Total:", oldStock);
    if (nuevo !== null) await updateDoc(doc(db, "productos", id), { stock: Number(nuevo) });
};

window.editDelivery = async (id) => {
    const nL = prompt("Nuevo lugar:");
    const nF = prompt("Nueva fecha/hora (AAAA-MM-DD HH:MM):");
    if (nL || nF) await updateDoc(doc(db, "entregas", id), { place: nL, time: nF });
};

window.deleteItem = async (col, id) => {
    if(confirm("¿Borrar definitivamente?")) await deleteDoc(doc(db, col, id));
};

window.getUrgencyClass = (dateStr) => {
    if (!dateStr) return "verde";
    const dif = (new Date(dateStr) - new Date()) / 3600000;
    return dif < 0 || dif <= 10 ? "rojo" : dif <= 48 ? "amarillo" : "verde";
};

window.formatAMPM = (dateStr) => {
    if (!dateStr) return "Sin fecha";
    const date = new Date(dateStr);
    return date.toLocaleDateString() + " " + date.getHours() % 12 + ":" + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes() + (date.getHours() >= 12 ? ' PM' : ' AM');
};

window.showBigPhoto = (url) => {
    const modal = document.getElementById("photo-modal");
    document.getElementById("modal-img").src = url || 'https://via.placeholder.com/300';
    modal.style.display = "flex";
};



