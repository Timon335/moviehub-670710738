import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewForm from './ReviewForm';

test('ยังไม่พิมพ์อะไร ปุ่มส่งต้องกดไม่ได้', () => {
  render(<ReviewForm movieTitle="Parasite" onSubmit={jest.fn()} />);

  expect(screen.getByRole('button', { name: 'ส่งรีวิว' })).toBeDisabled();
});

test('พิมพ์แล้วกดส่ง ต้องเรียก onSubmit ด้วยข้อความที่พิมพ์ แล้วขึ้นข้อความขอบคุณ', async () => {
  const user = userEvent.setup();
  const onSubmit = jest.fn().mockResolvedValue();          // แม่ปลอม: รับแล้วบอกว่าสำเร็จ
  render(<ReviewForm movieTitle="Parasite" onSubmit={onSubmit} />);

  await user.type(screen.getByPlaceholderText(/ดูแล้วรู้สึกอย่างไร/), 'สนุกมาก ฉากแอ็กชันดี');
  await user.click(screen.getByRole('button', { name: 'ส่งรีวิว' }));

  expect(onSubmit).toHaveBeenCalledWith('สนุกมาก ฉากแอ็กชันดี');
  expect(await screen.findByText(/ขอบคุณสำหรับรีวิว Parasite/)).toBeInTheDocument();
});