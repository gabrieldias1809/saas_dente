import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory Database (Mocked for now, can be persisted to JSON)
const DB_FILE = path.join(__dirname, 'database.json');

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return { orders: [] };
  }
  const data = fs.readFileSync(DB_FILE);
  return JSON.parse(data);
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Ensure DB exists safely
try {
  if (!fs.existsSync(DB_FILE)) {
    writeDB({ orders: [] });
  }
} catch (e) {
  console.log("Aviso: Não foi possível criar database.json na inicialização. Verifique as permissões ou configurações de volume (Mount) no EasyPanel.");
}

// ----------------------------------------
// ROUTES
// ----------------------------------------

// 1. POST /api/checkout (Criar PIX)
app.post('/api/checkout', async (req, res) => {
  try {
    // Generate a unique identifier for our order
    const identifier = uuidv4();
    
    // Check if we have SyncPay credentials configured
    const clientId = process.env.SYNCPAY_CLIENT_ID;
    const clientSecret = process.env.SYNCPAY_CLIENT_SECRET;
    
    let pix_code = "";
    
    // Se a API for real e as chaves existirem
    if (clientId && clientSecret) {
      const pixPayload = {
        amount: 15.90, // Valor fixado conforme a regra de negócio
        description: "Laudo Completo e Protocolo DenteSafe",
        webhook_url: process.env.SYNCPAY_WEBHOOK_URL, // Ex: https://seu-app.easypanel.host/api/webhook/syncpay
        client: {
          name: "Cliente Anônimo",
          cpf: "00000000000",
          email: "cliente@dentesafe.com",
          phone: "5511999999999"
        }
      };
      
      // Chamada fictícia/real para SyncPay (ajuste a URL para a real da SyncPay)
      /*
      const response = await axios.post('https://api.syncpay.com.br/v1/pix', pixPayload, {
        headers: {
          'Client-Id': clientId,
          'Client-Secret': clientSecret
        }
      });
      pix_code = response.data.pix_code;
      // identifier could also come from SyncPay depending on their API logic
      */
      
      // MOCK FALLBACK
      pix_code = "00020101021126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426655440000520400005303986540515.905802BR5913DenteSafe App6009Sao Paulo62070503***6304E1D2";
    } else {
      // Mocked response for development when env vars are missing
      pix_code = "00020101021126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426655440000520400005303986540515.905802BR5913DenteSafe App6009Sao Paulo62070503***6304E1D2";
    }

    // Guardar no banco
    const db = readDB();
    db.orders.push({
      identifier,
      pix_code,
      paid: false,
      amount: 15.90,
      createdAt: new Date().toISOString()
    });
    writeDB(db);

    res.status(200).json({
      identifier,
      pix_code
    });

  } catch (error) {
    console.error("Erro no checkout:", error);
    res.status(500).json({ error: "Erro interno ao gerar o PIX" });
  }
});

// 2. GET /api/status/:id (Polling Status)
app.get('/api/status/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const order = db.orders.find(o => o.identifier === id);

  if (!order) {
    return res.status(404).json({ error: "Pedido não encontrado" });
  }

  res.status(200).json({ paid: order.paid });
});

// 3. POST /api/webhook/syncpay (Webhook)
app.post('/api/webhook/syncpay', (req, res) => {
  console.log("Recebendo Webhook da SyncPay:", req.body);
  
  // A documentação diz: Verifique se status é "completed" ou "PAID"
  const { status, identifier } = req.body;
  
  if (status === 'completed' || status === 'PAID') {
    const db = readDB();
    const orderIndex = db.orders.findIndex(o => o.identifier === identifier);
    
    if (orderIndex !== -1) {
      db.orders[orderIndex].paid = true;
      db.orders[orderIndex].paidAt = new Date().toISOString();
      writeDB(db);
      console.log(`Pedido ${identifier} marcado como PAGO com sucesso.`);
    } else {
      console.log(`Aviso: Pedido ${identifier} recebido no webhook, mas não encontrado no banco de dados local.`);
    }
  }

  // Sempre retornar 200 rápido!
  res.status(200).json({ received: true });
});

// 4. Rota de Healthcheck (Para o EasyPanel saber que o app iniciou)
app.get('/', (req, res) => {
  res.status(200).send('Backend DenteSafe Operacional');
});

// Start Server
app.listen(port, '0.0.0.0', () => {
  console.log(`Backend rodando na porta ${port} e ouvindo em 0.0.0.0`);
});
