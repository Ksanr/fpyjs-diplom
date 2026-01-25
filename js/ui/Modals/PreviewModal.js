/**
 * Класс PreviewModal
 * Используется как обозреватель загруженный файлов в облако
 */
class PreviewModal extends BaseModal {
  constructor(element) {
    super(element);
    this.registerEvents();
  }

  /**
   * Добавляет обработчики событий
   */
  registerEvents() {
    // Закрытие по крестику
    this.element.querySelector('.x.icon').addEventListener('click', () => {
      this.close();
    });

    // Обработка кликов в контенте
    const content = this.element.querySelector('.scrolling.content');
    if (content) {
      content.addEventListener('click', (e) => {
        // Клик на кнопке удаления
        if (e.target.closest('.delete')) {
          const button = e.target.closest('.delete');
          const icon = button.querySelector('i');
          const path = button.dataset.path;

          if (!path) {
            alert('Не указан путь к файлу');
            return;
          }

          // Показываем индикатор загрузки
          icon.className = 'icon spinner loading';
          button.classList.add('disabled');

          Yandex.removeFile(path, (err, response) => {
            if (err) {
              alert(`Ошибка при удалении: ${err.message}`);
              icon.className = 'trash icon';
              button.classList.remove('disabled');
              return;
            }

            // Удаляем контейнер с изображением
            const container = button.closest('.image-preview-container');
            if (container) {
              container.remove();
            }

            // Если больше нет файлов, показываем сообщение
            const remaining = this.element.querySelectorAll('.image-preview-container');
            if (remaining.length === 0) {
              const content = this.element.querySelector('.scrolling.content');
              content.innerHTML = '<p>Нет загруженных файлов</p>';
            }
          });
        }

        // Клик на кнопке скачивания
        if (e.target.closest('.download')) {
          const button = e.target.closest('.download');
          const fileUrl = button.dataset.file;
          Yandex.downloadFileByUrl(fileUrl);
        }
      });
    }
  }

  /**
   * Отрисовывает изображения
   */
  showImages(data) {
    const content = this.element.querySelector('.scrolling.content');
    if (!content) {
      console.error('Блок .scrolling.content не найден');
      return;
    }

    if (!data || data.length === 0) {
      content.innerHTML = '<p>Нет загруженных файлов</p>';
      return;
    }

    console.log('Отрисовываем', data.length, 'файлов:', data);

    try {
      const html = data.reverse().map(item => this.getImageInfo(item)).join('');
      content.innerHTML = html;
    } catch (error) {
      console.error('Ошибка при отрисовке изображений:', error);
      content.innerHTML = `<p>Ошибка при отображении файлов: ${error.message}</p>`;
    }
  }

  /**
   * Форматирует дату
   */
  formatDate(dateString) {
    if (!dateString) return 'Неизвестно';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Неизвестно';
      }

      const options = {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };

      return date.toLocaleDateString('ru-RU', options).replace(',', ' в');
    } catch (error) {
      console.error('Ошибка форматирования даты:', error);
      return 'Неизвестно';
    }
  }

  /**
   * Возвращает разметку для изображения
   */
  getImageInfo(item) {
    // Проверяем наличие необходимых полей
    if (!item) {
      console.error('Элемент данных пустой');
      return '<div class="ui message error">Ошибка данных файла</div>';
    }

    const name = item.name || 'Без имени';
    const size = item.size ? `${Math.round(item.size / 1024)} Кб` : 'Неизвестно';
    const date = this.formatDate(item.modified || item.created);
    const path = item.path || '';
    const file = item.file || item.preview || '';

    return `
      <div class="image-preview-container">
        <img src="${file || 'https://yugcleaning.ru/wp-content/themes/consultix/images/no-image-found-360x250.png'}"
             alt="${name}"
             onerror="this.src='https://yugcleaning.ru/wp-content/themes/consultix/images/no-image-found-360x250.png'"/>
        <table class="ui celled table">
          <thead>
            <tr><th>Имя</th><th>Создано</th><th>Размер</th></tr>
          </thead>
          <tbody>
            <tr><td>${name}</td><td>${date}</td><td>${size}</td></tr>
          </tbody>
        </table>
        <div class="buttons-wrapper">
          <button class="ui labeled icon red basic button delete" data-path="${path}">
            Удалить
            <i class="trash icon"></i>
          </button>
          <button class="ui labeled icon violet basic button download" data-file="${file}">
            Скачать
            <i class="download icon"></i>
          </button>
        </div>
      </div>
    `;
  }
}