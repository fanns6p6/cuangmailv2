// ============================================
// CUANGMAIL V2 - FULL VERSION (Tanpa API Proxy)
// Harga: Rp2.500 per Gmail
// Payment: DANA Only
// Minimal WD: Rp1.000
// Data tersimpan di localStorage
// ============================================

const PRICE_PER_EMAIL = 2500;
const MAX_GENERATE = 50;
const MIN_WITHDRAW = 1000;
const DANA_FEE = 48;

let currentUser = null;
let users = {};
let currentTask = { emails: [], roomName: "Task Email Premium", roomPrice: PRICE_PER_EMAIL };
let autoCheckInterval = null;

function formatRupiah(amount) {
    return `Rp ${Number(amount || 0).toLocaleString('id-ID')}`;
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
}

function showMessage(msg, type = 'system') {
    const panel = document.getElementById('panelBody');
    if (!panel) return;
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = msg;
    panel.appendChild(div);
    div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearPanel() {
    const panel = document.getElementById('panelBody');
    if (panel) panel.innerHTML = '';
}

function setPanelTitle(title) {
    const titleEl = document.getElementById('panelTitle');
    if (titleEl) titleEl.textContent = title;
}

function closePanel() {
    clearPanel();
    setPanelTitle('Beranda');
    showWelcome();
}

function loadData() {
    const saved = localStorage.getItem('cuangmail_users_final');
    if (saved) {
        try {
            users = JSON.parse(saved);
        } catch(e) {
            users = {};
        }
    }
}

function saveUsers() {
    localStorage.setItem('cuangmail_users_final', JSON.stringify(users));
}

function saveCurrentUser() {
    if (currentUser) {
        users[currentUser.username] = currentUser;
        saveUsers();
    }
}

// ========== CEK PENDING DEPOSIT (Simulasi ACC) ==========
function checkPendingDeposits() {
    if (!currentUser) return;
    
    const pendingDeposits = currentUser?.deposits?.filter(d => d.status === 'pending' && !d.checked) || [];
    
    if (pendingDeposits.length === 0) {
        showMessage('Tidak ada pending deposit yang perlu dicek', 'system');
        return;
    }
    
    let totalAdded = 0;
    let totalDenied = 0;
    
    for (const deposit of pendingDeposits) {
        // Simulasi ACC: 70% chance di-ACC, 30% ditolak
        const isAccepted = Math.random() > 0.3;
        
        if (isAccepted) {
            deposit.status = 'accepted';
            deposit.acceptedAt = new Date().toISOString();
            currentUser.balance = (currentUser.balance || 0) + deposit.received;
            currentUser.pendingBalance = (currentUser.pendingBalance || 0) - deposit.received;
            currentUser.stats.tasksDone = (currentUser.stats.tasksDone || 0) + deposit.count;
            totalAdded += deposit.received;
            showMessage(`✅ ${deposit.count} email di-ACC! +${formatRupiah(deposit.received)} masuk ke saldo`, 'success');
        } else {
            deposit.status = 'denied';
            deposit.deniedReason = 'Tidak memenuhi kriteria';
            currentUser.pendingBalance = (currentUser.pendingBalance || 0) - deposit.received;
            totalDenied += deposit.count;
            showMessage(`❌ ${deposit.count} email ditolak. Tidak ada penambahan saldo.`, 'error');
        }
        deposit.checked = true;
    }
    
    if (totalAdded > 0 || totalDenied > 0) {
        saveCurrentUser();
        updateStats();
    }
}

function updateStats() {
    if (!currentUser) return;
    
    const statBalance = document.getElementById('statBalance');
    const statPending = document.getElementById('statPending');
    const statTasksDone = document.getElementById('statTasksDone');
    const statWithdrawn = document.getElementById('statWithdrawn');
    const navUsername = document.getElementById('navUsername');
    
    if (statBalance) statBalance.textContent = formatRupiah(currentUser.balance || 0);
    if (statPending) statPending.textContent = formatRupiah(currentUser.pendingBalance || 0);
    if (statTasksDone) statTasksDone.textContent = currentUser.stats?.tasksDone || 0;
    if (statWithdrawn) statWithdrawn.textContent = formatRupiah(currentUser.totalWithdrawn || 0);
    if (navUsername) navUsername.textContent = currentUser.displayName;
}

function showWelcome() {
    const panel = document.getElementById('panelBody');
    if (!panel) return;
    
    panel.innerHTML = `
        <div class="dana-card">
            <div class="dana-icon">💰</div>
            <div class="payment-badge">Payment DANA Only</div>
            <div style="margin-top: 10px;">💳 Semua pembayaran via DANA</div>
            <div style="font-size: 12px; margin-top: 5px;">Potongan: Rp${DANA_FEE.toLocaleString()}</div>
        </div>
        <div class="message system">
            <strong>👋 Halo, ${currentUser?.displayName || 'Worker'}!</strong><br><br>
            <strong>💰 Harga per Gmail: Rp2.500</strong><br>
            <strong>🏧 Minimal Tarik: Rp1.000</strong><br>
            <strong>💳 Payment: DANA (potongan Rp48)</strong><br><br>
            <strong>📊 Status Saldo:</strong><br>
            • Saldo Tersedia: ${formatRupiah(currentUser?.balance || 0)}<br>
            • Pending ACC: ${formatRupiah(currentUser?.pendingBalance || 0)}<br><br>
            <strong>📝 Informasi DANA:</strong><br>
            • Nama: ${currentUser?.fullName || '-'}<br>
            • No DANA: ${currentUser?.danaNumber || '-'}
        </div>
        <button class="btn btn-secondary btn-block" style="margin-top: 10px;" onclick="checkPendingDeposits()">🔄 Cek ACC</button>
    `;
}

function generateEmails(count) {
    const emails = [];
    const timestamp = Date.now();
    for (let i = 0; i < count; i++) {
        emails.push(`task${timestamp}${i}${Math.floor(Math.random() * 10000)}@gmail.com`);
    }
    return emails;
}

function copyText(text) {
    navigator.clipboard.writeText(text);
    showMessage('Email disalin!', 'success');
}

function copyAllEmails() {
    if (currentTask.emails && currentTask.emails.length) {
        navigator.clipboard.writeText(currentTask.emails.join('\n'));
        showMessage(`${currentTask.emails.length} email disalin!`, 'success');
    }
}

function showAmbilTask() {
    clearPanel();
    setPanelTitle('📥 Ambil Task Email');
    
    const panel = document.getElementById('panelBody');
    panel.innerHTML = `
        <div class="message system">
            <strong>💰 Harga per Gmail: Rp${PRICE_PER_EMAIL.toLocaleString()}</strong><br>
            Maksimal 50 email per ambil.
        </div>
        <div class="rules-box">
            <h4>📝 Aturan Task</h4>
            <ul>
                <li>Password wajib: <code>aass1122</code></li>
                <li>Tahun lahir: <code>2000 - 2006</code></li>
                <li>Email harus sama persis dengan yang diberikan bot</li>
            </ul>
        </div>
        <div class="form-group">
            <label>Jumlah Email</label>
            <input type="number" id="taskCount" min="1" max="50" placeholder="Contoh: 10">
        </div>
        <button class="btn btn-primary btn-block" onclick="prosesAmbilTask()">🎯 Ambil Task Sekarang</button>
    `;
}

async function prosesAmbilTask() {
    const countInput = document.getElementById('taskCount');
    const count = parseInt(countInput?.value || 0);
    
    if (!count || count < 1) {
        showMessage('Masukkan jumlah email yang valid', 'error');
        return;
    }
    if (count > MAX_GENERATE) {
        showMessage(`Maksimal ${MAX_GENERATE} email`, 'error');
        return;
    }

    showLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const emails = generateEmails(count);
    currentTask.emails = emails;
    currentTask.totalEarn = count * PRICE_PER_EMAIL;
    showLoading(false);

    clearPanel();
    setPanelTitle('📋 Task Email Kamu');

    const emailItems = emails.map((e, i) => `
        <div class="email-item">
            <span>${i + 1}. ${e}</span>
            <button class="email-copy" onclick="copyText('${e}')">Salin</button>
        </div>
    `).join('');
    
    const panel = document.getElementById('panelBody');
    panel.innerHTML = `
        <div class="message success">
            <strong>✅ Task Berhasil Diambil!</strong><br>
            📧 Total: ${emails.length} email<br>
            💵 Total pendapatan: ${formatRupiah(currentTask.totalEarn)}
        </div>
        <div class="email-list">
            <div style="display:flex;justify-content:space-between;margin-bottom:12px">
                <strong>📧 List Email</strong>
                <button class="btn-secondary" style="padding:6px 12px" onclick="copyAllEmails()">📋 Salin Semua</button>
            </div>
            ${emailItems}
        </div>
        <div class="rules-box">
            <strong>⚠️ PENTING!</strong><br>
            Password: <code>aass1122</code> | Tahun lahir: <code>2000-2006</code>
        </div>
        <button class="btn btn-success btn-block" onclick="showSetorTask()">📤 Setor Task Sekarang</button>
    `;
}

function showSetorTask() {
    if (!currentTask.emails?.length) {
        showMessage('Belum ada task. Ambil task dulu!', 'error');
        return;
    }
    if (!currentUser.danaNumber) {
        showMessage('Data DANA tidak ditemukan. Hubungi admin.', 'error');
        return;
    }

    clearPanel();
    setPanelTitle('📤 Setor Task Email');

    const totalEarn = currentTask.emails.length * PRICE_PER_EMAIL;
    const afterFee = totalEarn - DANA_FEE;

    const panel = document.getElementById('panelBody');
    panel.innerHTML = `
        <div class="dana-card">
            <div class="dana-icon">💳</div>
            <div>Pembayaran via <strong>DANA</strong></div>
            <div>Potongan: Rp${DANA_FEE.toLocaleString()}</div>
        </div>
        <div class="message system">
            <strong>📤 Setor Task</strong><br>
            📦 Room: ${currentTask.roomName}<br>
            📧 Email: ${currentTask.emails.length} buah<br>
            💰 Total Kotor: ${formatRupiah(totalEarn)}<br>
            💳 DANA: ${currentUser.fullName} - ${currentUser.danaNumber}<br>
            🔻 Potongan DANA: ${formatRupiah(DANA_FEE)}<br>
            ✅ Total Diterima: ${formatRupiah(afterFee)}
        </div>
        <div class="email-list" style="max-height:200px">
            <strong>📧 List Email:</strong><br>
            ${currentTask.emails.map(e => `<code>${e}</code><br>`).join('')}
        </div>
        <div class="rules-box">
            <strong>⚠️ Setelah setor, tunggu ACC dari admin.</strong><br>
            Saldo akan bertambah otomatis setelah di-ACC.
        </div>
        <button class="btn btn-success btn-block" onclick="prosesSetorTask()">✅ Konfirmasi Setor</button>
        <button class="btn btn-secondary btn-block" style="margin-top:12px" onclick="showAmbilTask()">🔙 Kembali</button>
    `;
}

function prosesSetorTask() {
    const totalEarn = currentTask.emails.length * PRICE_PER_EMAIL;
    const afterFee = totalEarn - DANA_FEE;
    
    if (!currentUser.deposits) currentUser.deposits = [];
    currentUser.deposits.push({
        id: Date.now(),
        emails: [...currentTask.emails],
        count: currentTask.emails.length,
        total: totalEarn,
        received: afterFee,
        fee: DANA_FEE,
        bank: 'DANA',
        account: currentUser.danaNumber,
        accountName: currentUser.fullName,
        status: 'pending',
        checked: false,
        createdAt: new Date().toISOString()
    });
    
    currentUser.pendingBalance = (currentUser.pendingBalance || 0) + afterFee;
    currentUser.stats = currentUser.stats || { tasksDone: 0, pendingTasks: 0, totalEarned: 0 };
    currentUser.stats.pendingTasks = (currentUser.stats.pendingTasks || 0) + currentTask.emails.length;
    
    saveCurrentUser();
    updateStats();
    
    showMessage(`✅ Setor berhasil! +${formatRupiah(afterFee)} masuk ke pending. Menunggu ACC dari pusat.`, 'success');
    
    currentTask.emails = [];
    
    setTimeout(() => closePanel(), 2000);
}

function showSaldo() {
    clearPanel();
    setPanelTitle('💰 Detail Saldo');
    
    const panel = document.getElementById('panelBody');
    panel.innerHTML = `
        <div class="dana-card">
            <div class="dana-icon">💰</div>
            <div>Saldo ${currentUser?.displayName}</div>
        </div>
        <div class="message system">
            <strong>📊 Detail Saldo:</strong><br><br>
            Saldo Tersedia: <strong>${formatRupiah(currentUser?.balance || 0)}</strong><br>
            Pending ACC: <strong>${formatRupiah(currentUser?.pendingBalance || 0)}</strong><br>
            Total sudah ditarik: ${formatRupiah(currentUser?.totalWithdrawn || 0)}<br>
            Total penghasilan: ${formatRupiah((currentUser?.balance || 0) + (currentUser?.totalWithdrawn || 0))}<br><br>
            <strong>💳 Informasi DANA:</strong><br>
            Nama: ${currentUser?.fullName || '-'}<br>
            No DANA: ${currentUser?.danaNumber || '-'}<br>
            Potongan DANA: ${formatRupiah(DANA_FEE)}<br>
            🏧 Minimal tarik: ${formatRupiah(MIN_WITHDRAW)}
        </div>
        <button class="btn btn-primary btn-block" onclick="showTarik()">🏧 Tarik Saldo</button>
        <button class="btn btn-secondary btn-block" onclick="checkPendingDeposits()">🔄 Cek ACC</button>
        <button class="btn btn-secondary btn-block" onclick="closePanel()">🔙 Kembali</button>
    `;
}

function showTarik() {
    if (!currentUser.danaNumber) {
        showMessage('Data DANA tidak ditemukan', 'error');
        return;
    }
    if (!currentUser.balance || currentUser.balance <= 0) {
        showMessage('Saldo tersedia masih 0', 'error');
        return;
    }
    if (currentUser.balance < MIN_WITHDRAW) {
        showMessage(`Saldo minimal untuk tarik adalah ${formatRupiah(MIN_WITHDRAW)}`, 'error');
        return;
    }

    clearPanel();
    setPanelTitle('🏧 Tarik Saldo');

    const maxWithdraw = currentUser.balance;

    const panel = document.getElementById('panelBody');
    panel.innerHTML = `
        <div class="dana-card">
            <div class="dana-icon">🏧</div>
            <div>Penarikan via <strong>DANA</strong></div>
            <div>Potongan: Rp${DANA_FEE.toLocaleString()}</div>
        </div>
        <div class="message system">
            Saldo tersedia: <strong>${formatRupiah(currentUser.balance)}</strong><br>
            Minimal tarik: <strong>${formatRupiah(MIN_WITHDRAW)}</strong><br>
            DANA tujuan: <strong>${currentUser.fullName} - ${currentUser.danaNumber}</strong><br>
            Potongan DANA: ${formatRupiah(DANA_FEE)}
        </div>
        <div class="form-group">
            <label>Nominal yang ingin ditarik (Minimal ${formatRupiah(MIN_WITHDRAW)})</label>
            <input type="number" id="withdrawAmount" min="${MIN_WITHDRAW}" max="${maxWithdraw}" placeholder="Contoh: 10000">
        </div>
        <button class="btn btn-primary btn-block" onclick="prosesTarik()">✅ Ajukan Penarikan</button>
        <button class="btn btn-secondary btn-block" onclick="showSaldo()">🔙 Kembali</button>
    `;
}

function prosesTarik() {
    const amountInput = document.getElementById('withdrawAmount');
    const amount = parseInt(amountInput?.value || 0);
    
    if (!amount || amount < MIN_WITHDRAW) {
        showMessage(`Minimal penarikan ${formatRupiah(MIN_WITHDRAW)}`, 'error');
        return;
    }
    if (amount > currentUser.balance) {
        showMessage('Saldo tidak mencukupi', 'error');
        return;
    }
    
    const receivedAmount = amount - DANA_FEE;
    
    if (!currentUser.withdrawals) currentUser.withdrawals = [];
    currentUser.withdrawals.push({
        id: Date.now(),
        amount: amount,
        received: receivedAmount,
        bank: 'DANA',
        account: currentUser.danaNumber,
        accountName: currentUser.fullName,
        status: 'pending',
        createdAt: new Date().toISOString()
    });
    
    currentUser.balance -= amount;
    currentUser.totalWithdrawn = (currentUser.totalWithdrawn || 0) + amount;
    saveCurrentUser();
    updateStats();
    
    showMessage(`✅ Penarikan ${formatRupiah(amount)} berhasil diajukan! Diterima: ${formatRupiah(receivedAmount)}. Menunggu proses admin.`, 'success');
    setTimeout(() => closePanel(), 2000);
}

function showRekening() {
    clearPanel();
    setPanelTitle('💳 Informasi DANA');
    
    const panel = document.getElementById('panelBody');
    panel.innerHTML = `
        <div class="dana-card">
            <div class="dana-icon">💰</div>
            <div>Payment <strong>DANA</strong> Only</div>
            <div>Potongan: Rp${DANA_FEE.toLocaleString()}</div>
        </div>
        <div class="message system">
            <strong>Informasi Rekening DANA Anda:</strong><br><br>
            Nama Lengkap: <strong>${currentUser?.fullName || '-'}</strong><br>
            Nomor DANA: <strong>${currentUser?.danaNumber || '-'}</strong><br><br>
            <strong>⚠️ Catatan:</strong><br>
            • Semua pembayaran akan dikirim ke DANA di atas<br>
            • Potongan DANA: Rp${DANA_FEE.toLocaleString()}<br>
            • Minimal tarik: ${formatRupiah(MIN_WITHDRAW)}
        </div>
        <button class="btn btn-secondary btn-block" onclick="closePanel()">🔙 Kembali</button>
    `;
}

function showHistory() {
    clearPanel();
    setPanelTitle('📜 Riwayat Transaksi');

    let html = '<div class="dana-card"><div class="dana-icon">📜</div><div>Riwayat Penarikan & Setoran</div></div>';

    const withdrawals = currentUser?.withdrawals || [];
    if (withdrawals.length > 0) {
        html += '<div class="message system"><strong>🏧 Riwayat Penarikan</strong></div>';
        withdrawals.slice().reverse().forEach(w => {
            const statusText = w.status === 'completed' ? '✅ Selesai' : '⏳ Pending';
            const statusColor = w.status === 'completed' ? '#d1fae5' : '#fed7aa';
            const textColor = w.status === 'completed' ? '#065f46' : '#92400e';
            html += `
                <div class="history-item">
                    <div>
                        <strong>${formatRupiah(w.amount)}</strong><br>
                        <small>Diterima: ${formatRupiah(w.received)}</small><br>
                        <small>${new Date(w.createdAt).toLocaleDateString('id-ID')}</small>
                    </div>
                    <div style="padding:4px 12px;border-radius:40px;background:${statusColor};color:${textColor}">${statusText}</div>
                </div>
            `;
        });
    }

    const deposits = currentUser?.deposits || [];
    if (deposits.length > 0) {
        html += '<div class="message system" style="margin-top: 16px;"><strong>📤 Riwayat Setoran</strong></div>';
        deposits.slice().reverse().forEach(d => {
            let statusText = '', statusColor = '', textColor = '';
            if (d.status === 'accepted') {
                statusText = '✅ ACC - Saldo Bertambah';
                statusColor = '#d1fae5';
                textColor = '#065f46';
            } else if (d.status === 'pending') {
                statusText = '⏳ Menunggu ACC';
                statusColor = '#fed7aa';
                textColor = '#92400e';
            } else {
                statusText = '❌ Ditolak';
                statusColor = '#fee2e2';
                textColor = '#991b1b';
            }
            html += `
                <div class="history-item">
                    <div>
                        <strong>${d.count} email</strong><br>
                        <small>Diterima: ${formatRupiah(d.received)}</small><br>
                        <small>${new Date(d.createdAt).toLocaleDateString('id-ID')}</small>
                    </div>
                    <div style="padding:4px 12px;border-radius:40px;background:${statusColor};color:${textColor}">${statusText}</div>
                </div>
            `;
        });
    }

    if (withdrawals.length === 0 && deposits.length === 0) {
        html += '<div class="message system">Belum ada riwayat transaksi.</div>';
    }

    html += `<button class="btn btn-secondary btn-block" style="margin-top: 16px;" onclick="closePanel()">🔙 Kembali</button>`;
    
    const panel = document.getElementById('panelBody');
    panel.innerHTML = html;
}

function startAutoCheck() {
    if (autoCheckInterval) clearInterval(autoCheckInterval);
    autoCheckInterval = setInterval(() => {
        if (currentUser && document.getElementById('appSection')?.style.display !== 'none') {
            checkPendingDeposits();
        }
    }, 30000);
}

function init() {
    loadData();
    const session = localStorage.getItem('cuangmail_session_final');
    if (!session || !users[session]) {
        window.location.href = 'index.html';
        return;
    }

    currentUser = users[session];
    
    if (!currentUser.stats) currentUser.stats = { tasksDone: 0, pendingTasks: 0, totalEarned: 0 };
    if (!currentUser.deposits) currentUser.deposits = [];
    if (!currentUser.withdrawals) currentUser.withdrawals = [];
    if (!currentUser.pendingBalance) currentUser.pendingBalance = 0;
    if (!currentUser.balance) currentUser.balance = 0;
    if (!currentUser.totalWithdrawn) currentUser.totalWithdrawn = 0;
    
    updateStats();
    showWelcome();
    startAutoCheck();
}

function logout() {
    if (autoCheckInterval) clearInterval(autoCheckInterval);
    localStorage.removeItem('cuangmail_session_final');
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    init();
});