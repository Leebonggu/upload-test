import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import axios from 'axios';

function App() {
  const ref = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedFile) {
      const formData = new FormData();
      formData.append('image', selectedFile);

      console.log(formData);

      try {
        const response = await axios.post('/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data; charset=utf-8',
          },
        });

        console.log('서버 응답:', response.data);
        console.log('파일 업로드 성공!');
        // 파일 업로드에 성공한 후의 로직을 추가할 수 있습니다.
      } catch (error) {
        console.error('파일 업로드 중 오류 발생:', error);
      } finally {
        setSelectedFile(null);
        if (ref.current) {
          ref.current.value = '';
        }
      }
    } else {
      console.log('파일을 선택해주세요.');
    }
  };

  useEffect(() => {
    axios.get('/api').then((res) => console.log(res.data));
  });

  return (
    <>
      <h1>파일 업로드</h1>
      <form onSubmit={onSubmit}>
        <input type="file" onChange={onChange} ref={ref} />
        <button type="submit">업로드</button>
      </form>
      <br />
      <div>{selectedFile?.name}</div>
    </>
  );
}

export default App;
