HOLIDAY PLANNER — LOCAL DEVELOPMENT v1.0

LOCAL TRIAL ONLY
Open frontend/index.html in a modern browser. This build uses browser Local Storage only.
It does not connect to WordPress, MySQL, Hostinger, or GitHub Pages. The included WordPress
plugin is unchanged reference material and is not used by this local build.

TEST ACCESS
- Master PIN: 240225
- Batu Escape Member PIN: 262626
- Bali Getaway has been removed from this local trial.

ROLE WORKFLOW
- Master: access all trips, create trips, create Admin accounts, assign trips and manage settings.
- Admin: access only assigned trips and manage their trip data.
- Member: enter the trip PIN only and view trip information. Add, edit, delete and save controls are hidden.
- There is no Requests menu or request/approval workflow for any role.

LIMITATIONS
This is a workflow prototype, not production security. PINs and role data are stored in Local Storage
and can be inspected or modified using browser developer tools. Do not store sensitive/private data.
Export a JSON backup from Settings before clearing browser data.


HOLIDAY PLANNER LOCAL DEV v3.2
Perbaikan:
- Bahasa Indonesia diterapkan pada navigasi, heading, deskripsi, label, tombol, form, tabel, dan konten dinamis setelah pindah halaman.
- Plan A/B hanya tersedia di Perencanaan Pemasukan dan Perencanaan Pengeluaran.
- Dashboard, Umum, Destinasi, Jadwal Perjalanan, dan Arus Kas tidak menampilkan pemilih Plan.
- Destinasi dan Jadwal Perjalanan disimpan pada tingkat trip; data lama dari Plan A/B dimigrasikan saat halaman dibuka.
- Arus Kas menampilkan transaksi dari kedua plan tanpa tab plan.
- Dark mode memakai permukaan navy dan teks kontras untuk panel, tab, tabel, tombol, serta form.

Catatan: Ini tetap versi trial lokal berbasis Local Storage. Pembatasan akses di frontend bukan keamanan produksi.
