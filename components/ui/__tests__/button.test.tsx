/**
 * @jest-environment jsdom
 */
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../button';

describe('<Button />', () => {
  it('se renderiza y responde al clic', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Cobrar</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Cobrar' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('deshabilitado no dispara el clic (evita cobrar dos veces)', async () => {
    const onClick = jest.fn();
    render(
      <Button onClick={onClick} disabled>
        Cobrando...
      </Button>
    );

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('aplica la variante y respeta las clases extra', () => {
    render(
      <Button variant="destructive" size="sm" className="w-full">
        Eliminar
      </Button>
    );
    const button = screen.getByRole('button', { name: 'Eliminar' });
    expect(button).toHaveClass('bg-red-600', 'h-8', 'w-full');
    expect(button).not.toHaveClass('bg-brand');
  });

  it('reenvía la ref al <button> nativo', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ok</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
