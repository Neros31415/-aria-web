from __future__ import annotations

import json
import os
import sqlite3
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from PySide6.QtCore import Qt, QThread, Signal
from PySide6.QtGui import QFont
from PySide6.QtWidgets import (
    QApplication,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QListWidget,
    QListWidgetItem,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QSplitter,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

APP_NAME = "ARIA"
BACKEND_URL = os.environ.get("ARIA_API_BASE_URL", "").strip().rstrip("/")
APP_DIR = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "ARIA"
APP_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = APP_DIR / "aria_memory.sqlite3"


class MemoryStore:
    """Small local SQLite store. This is local persistence, not encrypted storage."""

    def __init__(self, db_path: Path = DB_PATH) -> None:
        self.db_path = db_path
        with self._connect() as db:
            db.execute(
                """CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )"""
            )
            db.execute(
                """CREATE TABLE IF NOT EXISTS memories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )"""
            )

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path)

    def add_message(self, role: str, content: str) -> None:
        with self._connect() as db:
            db.execute(
                "INSERT INTO messages(role, content) VALUES (?, ?)",
                (role, content),
            )

    def recent_messages(self, limit: int = 30) -> list[dict[str, str]]:
        with self._connect() as db:
            rows = db.execute(
                "SELECT role, content FROM messages ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [{"role": role, "content": content} for role, content in reversed(rows)]

    def add_memory(self, content: str) -> None:
        with self._connect() as db:
            db.execute("INSERT INTO memories(content) VALUES (?)", (content,))

    def memories(self) -> list[str]:
        with self._connect() as db:
            rows = db.execute(
                "SELECT content FROM memories ORDER BY id DESC LIMIT 100"
            ).fetchall()
        return [row[0] for row in rows]


class ChatWorker(QThread):
    completed = Signal(str)
    failed = Signal(str)

    def __init__(self, messages: list[dict[str, str]]) -> None:
        super().__init__()
        self.messages = messages

    def run(self) -> None:
        if not BACKEND_URL:
            latest = next(
                (m["content"] for m in reversed(self.messages) if m["role"] == "user"),
                "",
            )
            self.completed.emit(
                "Mode démo local : votre message est enregistré, mais aucun modèle IA "
                "n'est connecté. Configurez ARIA_API_BASE_URL sur un backend sécurisé "
                "pour activer les réponses IA."
                if latest
                else "Bonjour. Je suis ARIA Desktop, en mode démo local."
            )
            return

        request_body = json.dumps({"messages": self.messages}).encode("utf-8")
        request = urllib.request.Request(
            f"{BACKEND_URL}/chat",
            data=request_body,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                payload: Any = json.loads(response.read().decode("utf-8"))
            reply = payload.get("reply") if isinstance(payload, dict) else None
            if not isinstance(reply, str) or not reply.strip():
                self.failed.emit("Réponse backend invalide : le champ texte 'reply' est absent.")
                return
            self.completed.emit(reply.strip())
        except urllib.error.HTTPError as exc:
            self.failed.emit(f"Le backend a renvoyé HTTP {exc.code}. Vérifiez son contrat et ses journaux.")
        except urllib.error.URLError:
            self.failed.emit("Backend inaccessible. Vérifiez l'URL, la connexion et le service.")
        except (TimeoutError, json.JSONDecodeError, OSError) as exc:
            self.failed.emit(f"Erreur de communication : {exc}")


class AriaWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.store = MemoryStore()
        self.setWindowTitle("ARIA — Assistant personnel")
        self.resize(980, 680)
        self.setMinimumSize(720, 500)
        self.setStyleSheet("""
            QMainWindow, QWidget { background: #080d16; color: #edf4ff; }
            QLabel#eyebrow { color: #78e4f5; font-size: 10px; font-weight: 700; }
            QLabel#title { font-size: 26px; font-weight: 700; }
            QLabel#status { color: #f5c879; padding: 6px 0; }
            QTextEdit, QLineEdit, QListWidget {
                background: #101827; color: #edf4ff; border: 1px solid #29364a;
                border-radius: 10px; padding: 9px; selection-background-color: #23556a;
            }
            QPushButton {
                background: #173242; color: #c8f8ff; border: 1px solid #39748a;
                border-radius: 10px; padding: 9px 14px; font-weight: 600;
            }
            QPushButton:hover { background: #20485a; }
            QPushButton:disabled { color: #718096; background: #111722; }
        """)

        root = QWidget()
        outer = QVBoxLayout(root)
        header = QHBoxLayout()
        branding = QVBoxLayout()
        eyebrow = QLabel("PERSONAL ASSISTANT · WINDOWS FOUNDATION")
        eyebrow.setObjectName("eyebrow")
        title = QLabel("ARIA")
        title.setObjectName("title")
        branding.addWidget(eyebrow)
        branding.addWidget(title)
        header.addLayout(branding)
        header.addStretch()
        self.status = QLabel("MODE DÉMO LOCAL" if not BACKEND_URL else "BACKEND CONFIGURÉ — NON VALIDÉ")
        self.status.setObjectName("status")
        header.addWidget(self.status)
        outer.addLayout(header)

        splitter = QSplitter(Qt.Orientation.Horizontal)
        left = QWidget()
        left_layout = QVBoxLayout(left)
        left_layout.addWidget(QLabel("CONVERSATION"))
        self.transcript = QTextEdit()
        self.transcript.setReadOnly(True)
        self.transcript.setFont(QFont("Segoe UI", 10))
        left_layout.addWidget(self.transcript, 1)
        composer = QHBoxLayout()
        self.input = QLineEdit()
        self.input.setPlaceholderText("Écrivez à ARIA…")
        self.input.returnPressed.connect(self.send_message)
        self.send_button = QPushButton("Envoyer")
        self.send_button.clicked.connect(self.send_message)
        composer.addWidget(self.input, 1)
        composer.addWidget(self.send_button)
        left_layout.addLayout(composer)

        right = QWidget()
        right_layout = QVBoxLayout(right)
        right_layout.addWidget(QLabel("MÉMOIRE LOCALE"))
        self.memory_list = QListWidget()
        right_layout.addWidget(self.memory_list, 1)
        self.memory_input = QLineEdit()
        self.memory_input.setPlaceholderText("Ajouter une note à retenir…")
        self.memory_input.returnPressed.connect(self.add_memory)
        right_layout.addWidget(self.memory_input)
        memory_button = QPushButton("Enregistrer la note")
        memory_button.clicked.connect(self.add_memory)
        right_layout.addWidget(memory_button)
        notice = QLabel("Le contrôle de Windows n'est pas activé. Les actions système nécessiteront une couche d'autorisations.")
        notice.setWordWrap(True)
        notice.setStyleSheet("color: #aab8ca; padding-top: 10px;")
        right_layout.addWidget(notice)

        splitter.addWidget(left)
        splitter.addWidget(right)
        splitter.setSizes([680, 280])
        outer.addWidget(splitter, 1)
        self.setCentralWidget(root)

        self.render_memories()
        self.render_existing_messages()

    def render_existing_messages(self) -> None:
        for item in self.store.recent_messages(limit=30):
            self.append_transcript(item["role"], item["content"])
        if not self.store.recent_messages(limit=1):
            self.append_transcript("assistant", "Bonjour. ARIA Desktop est prête en mode démo local.")

    def append_transcript(self, role: str, content: str) -> None:
        label = "VOUS" if role == "user" else "ARIA"
        safe_text = content.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        self.transcript.append(f"<b>{label}</b><br>{safe_text}<br><br>")

    def send_message(self) -> None:
        content = self.input.text().strip()
        if not content:
            return
        self.input.clear()
        self.store.add_message("user", content)
        self.append_transcript("user", content)
        self.send_button.setEnabled(False)
        self.input.setEnabled(False)
        self.status.setText("TRAITEMENT…")
        self.worker = ChatWorker(self.store.recent_messages(limit=30))
        self.worker.completed.connect(self.on_reply)
        self.worker.failed.connect(self.on_error)
        self.worker.finished.connect(self.restore_input)
        self.worker.start()

    def on_reply(self, reply: str) -> None:
        self.store.add_message("assistant", reply)
        self.append_transcript("assistant", reply)
        self.status.setText("MODE DÉMO LOCAL" if not BACKEND_URL else "RÉPONSE REÇUE")

    def on_error(self, message: str) -> None:
        self.status.setText("ERREUR")
        QMessageBox.warning(self, "ARIA — problème de connexion", message)

    def restore_input(self) -> None:
        self.send_button.setEnabled(True)
        self.input.setEnabled(True)
        self.input.setFocus()

    def render_memories(self) -> None:
        self.memory_list.clear()
        for memory in self.store.memories():
            QListWidgetItem(memory, self.memory_list)

    def add_memory(self) -> None:
        content = self.memory_input.text().strip()
        if not content:
            return
        self.store.add_memory(content)
        self.memory_input.clear()
        self.render_memories()


def main() -> int:
    app = QApplication(sys.argv)
    app.setApplicationName(APP_NAME)
    window = AriaWindow()
    window.show()
    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())
