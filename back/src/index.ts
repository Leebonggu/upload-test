import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import multer from "multer";
import AdmZip from "adm-zip";
import * as xlsx from "xlsx";
import fs from "fs";
import path from "path";

const app = express();
const PORT = 4000;

type Original = {
  id: number;
  country: string;
  currency: string;
  source_amount?: number;
  target_amount?: number;
  invoice_id: string;
};

type OriginalWithDestination = Original & {
  destination: string | null;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "uploads");
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // 파일명 설정 (여기서는 원본 파일명을 그대로 사용)
    const unique = Date.now().toString();
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// 미들웨어 설정 (body-parser 등)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// 라우트 예시

app.get("/", (req: Request, res: Response) => {
  res.send("Express 앱이 실행 중입니다.");
});

app.get("/data", (req: Request, res: Response) => {
  res.send("Express 앱이 실행 중입니다.");
});

app.post("/upload", upload.single("image"), (req: Request, res: Response) => {
  try {
    const { unzip, destinationFolder } = unzipAndRead(req.file!);

    if (unzip.excel.length === 0) {
      console.log("here?");
      throw new Error("엑셀 파일이 없습니다.");
    }
    if (unzip.excel.length > 1) {
      throw new Error("엑셀 파일은 1개만 업로드 가능합니다.");
    }

    const { excel, invoices } = unzip;

    const json = parseExcel(path.join(destinationFolder, excel[0]));
    const withDes = mapInvoice(json, invoices, destinationFolder);

    console.log(withDes);

    return res.status(201).send({
      ok: true,
    });
  } catch (error) {
    return res.status(400).send({
      ok: false,
      error: error,
    });
  }
});

function unzipAndRead(file: Express.Multer.File) {
  const uploadedFilePath = path.join(__dirname, "uploads", file?.filename);
  const destinationFolder = path.join(
    __dirname,
    "uploads",
    file?.filename.replace(".zip", ""),
  );
  // adm-zip을 사용하여 압축 해제
  const zip = new AdmZip(uploadedFilePath);
  zip.extractAllTo(destinationFolder, true);

  const unzip = readExcelAndOther(destinationFolder);

  fs.unlinkSync(uploadedFilePath); // 원본파일 삭제

  return { unzip, destinationFolder };
}

function readExcelAndOther(uploadRoot: string) {
  const files = fs.readdirSync(uploadRoot);
  return files.reduce(
    (acc, cur) => {
      if (path.extname(cur) === ".xlsx") {
        acc.excel.push(cur);
      } else {
        if (cur.includes("MACOSX")) return acc;
        acc.invoices.push(cur);
      }

      return acc;
    },
    {
      excel: [] as string[],
      invoices: [] as string[],
    },
  );
}

function parseExcel(filePath: string) {
  const wb = xlsx.readFile(filePath);

  const sheet = wb.Sheets[wb.SheetNames[0]];

  const json: Original[] = xlsx.utils.sheet_to_json(sheet);

  return json.map((trx) => quote(trx));
}

function mapInvoice(
  parsed: Original[],
  invoices: string[],
  filePath: string,
): OriginalWithDestination[] {
  return parsed.map((tr) => {
    const fullName = invoices.find((inv) => {
      const name = inv.split(".")[0];
      return (tr["invoice_id"] = name);
    });

    if (!fullName) {
      return {
        ...tr,
        destination: null,
      };
    }

    return {
      ...tr,
      destination: `${filePath}/${fullName}`,
    };
  });
}

function quote(excelJson: Original) {
  const { source_amount, target_amount } = excelJson;
  if (source_amount) {
    return {
      ...excelJson,
      target_amount: source_amount / 1.1,
    };
  }
  if (target_amount) {
    return {
      ...excelJson,
      source_amount: target_amount * 1.1,
    };
  }
  return excelJson;
}

// 에러 핸들링 미들웨어 설정

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
