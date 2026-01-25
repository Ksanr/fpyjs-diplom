/**
 * Класс PreviewModal
 * Используется как обозреватель загруженный файлов в облаке
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
              content.innerHTML = '<p>В папке /vk/ нет загруженных файлов</p>';
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
   * Отрисовывает изображения в блоке всплывающего окна
   */
  showImages(data) {
    const content = this.element.querySelector('.scrolling.content');
    if (!content) {
      console.error('Блок .scrolling.content не найден');
      return;
    }

    if (!data || data.length === 0) {
      content.innerHTML = '<p>В папке /vk/ нет загруженных файлов</p>';
      return;
    }

    console.log('Отрисовываем', data.length, 'файлов из папки /vk/:', data);

    try {
      // Сортируем файлы по дате изменения (новые сверху)
      const sortedData = [...data].sort((a, b) => {
        return new Date(b.modified) - new Date(a.modified);
      });

      const html = sortedData.map(item => this.getImageInfo(item)).join('');
      content.innerHTML = html;
    } catch (error) {
      console.error('Ошибка при отрисовке изображений:', error);
      content.innerHTML = `<p>Ошибка при отображении файлов: ${error.message}</p>`;
    }
  }

  /**
   * Форматирует дату в удобный формат
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
        minute: '2-digit',
        timeZone: 'Europe/Moscow'
      };

      const dateFormatted = date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const timeFormatted = date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });

      return `${dateFormatted} в ${timeFormatted}`;
    } catch (error) {
      console.error('Ошибка форматирования даты:', error);
      return 'Неизвестно';
    }
  }

  /**
   * Форматирует размер файла
   */
  formatSize(bytes) {
    if (!bytes) return 'Неизвестно';

    const units = ['Б', 'КБ', 'МБ', 'ГБ'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Возвращает разметку из изображения, таблицы с описанием данных изображения и кнопок контроллеров
   */
  getImageInfo(item) {
    // Проверяем наличие необходимых полей
    if (!item) {
      console.error('Элемент данных пустой');
      return '<div class="ui message error">Ошибка данных файла</div>';
    }

    const name = item.name || 'Без имени';
    const size = this.formatSize(item.size);
    const date = this.formatDate(item.modified);
    const path = item.path || '';
    const file = item.file || item.preview || '';

    // Убираем папку /vk/ из отображаемого имени для читаемости
    const displayName = name.startsWith('/vk/') ? name.substring(4) : name;

    return `
      <div class="image-preview-container">
        <img src="${file || 'https://yugcleaning.ru/wp-content/themes/consultix/images/no-image-found-360x250.png'}"
             alt="${displayName}"
             onerror="this.src='https://yugcleaning.ru/wp-content/themes/consultix/images/no-image-found-360x250.png'"/>
        <table class="ui celled table">
          <thead>
            <tr><th>Имя файла</th><th>Дата изменения</th><th>Размер</th></tr>
          </thead>
          <tbody>
            <tr><td>${displayName}</td><td>${date}</td><td>${size}</td></tr>
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