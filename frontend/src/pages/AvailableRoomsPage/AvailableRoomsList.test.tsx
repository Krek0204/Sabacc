import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';
import { AvailableRoomsList, type RoomInfo } from './AvailableRoomsList';

const rooms: RoomInfo[] = [
  { id: 123, status: 'WAITING_SECOND_USER', playerFirstId: 10, playerSecondId: null },
  { id: '456', status: 'ALL_USERS_JOINED', playerFirstId: 20, playerSecondId: 789 },
];

const renderList = (props: Partial<Parameters<typeof AvailableRoomsList>[0]> = {}) =>
  renderToStaticMarkup(
    <AvailableRoomsList
      rooms={rooms}
      loading={false}
      error={null}
      searchQuery=""
      statusFilter=""
      onJoinRoom={vi.fn()}
      {...props}
    />
  );

describe('Список комнат — FR-SWR-2-13-2', () => {
  test('показывает сообщение вместо пустого списка при неизвестном ID', () => {
    const html = renderList({ searchQuery: '999' });
    expect(html).toContain('Комнаты не найдены');
    expect(html).not.toContain('<table');
  });

  test.each(['12', '456', '78', ' 789 '])('ищет по ID комнаты и соперника: %s', searchQuery => {
    const html = renderList({ searchQuery });
    expect(html).toContain('<table');
    expect(html).not.toContain('</tr><tr>');
    expect(html).not.toContain('Комнаты не найдены');
    expect(html).toContain(searchQuery === '12' ? '<td>123</td>' : '<td>456</td>');
  });

  test('очистка запроса возвращает комнаты после отсутствия результатов', () => {
    expect(renderList({ searchQuery: '999' })).toContain('Комнаты не найдены');
    const html = renderList({ searchQuery: '' });
    expect(html).toContain('<td>123</td>');
    expect(html).toContain('<td>456</td>');
    expect(html).not.toContain('Комнаты не найдены');
  });

  test('применяет поиск и фильтр статуса одновременно', () => {
    expect(renderList({ searchQuery: '789', statusFilter: 'WAITING_SECOND_USER' }))
      .toContain('Комнаты не найдены');
    expect(renderList({ searchQuery: '789', statusFilter: 'ALL_USERS_JOINED' }))
      .toContain('<td>456</td>');
  });

  test('показывает отсутствие совпадений по статусу без запроса', () => {
    expect(renderList({ statusFilter: 'FINISHED' })).toContain('Комнаты не найдены');
  });

  test('отличает пустой список от отсутствия результатов поиска', () => {
    expect(renderList({ rooms: [] })).toContain('Нет комнат');
    expect(renderList({ rooms: [], searchQuery: '999' })).toContain('Комнаты не найдены');
  });

  test.each([null, undefined])('не ищет по отсутствующему ID соперника: %s', playerSecondId => {
    expect(renderList({ rooms: [{ ...rooms[0], playerSecondId }], searchQuery: String(playerSecondId) }))
      .toContain('Комнаты не найдены');
  });

  test('во время загрузки не показывает пустое состояние или старые результаты', () => {
    const html = renderList({ loading: true, searchQuery: '999' });
    expect(html).toContain('Загрузка...');
    expect(html).not.toContain('Комнаты не найдены');
    expect(html).not.toContain('<table');
  });

  test('при ошибке не показывает пустое состояние или таблицу', () => {
    const html = renderList({ rooms: [], error: 'Ошибка загрузки комнат' });
    expect(html).toContain('Ошибка загрузки комнат');
    expect(html).not.toContain('Нет комнат');
    expect(html).not.toContain('Комнаты не найдены');
    expect(html).not.toContain('<table');
  });
});
