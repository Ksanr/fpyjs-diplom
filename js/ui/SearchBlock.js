/**
 * Класс SearchBlock
 * Используется для взаимодействием со строкой ввода и поиска изображений
 */
class SearchBlock {
  constructor(element) {
    this.element = element;
    this.registerEvents();
  }

  /**
   * Выполняет подписку на кнопки "Заменить" и "Добавить"
   */
  registerEvents() {
    const replaceBtn = this.element.querySelector('.button.replace');
    const addBtn = this.element.querySelector('.button.add');
    const input = this.element.querySelector('input[type="text"]');

    replaceBtn.addEventListener('click', () => {
      const userId = input.value.trim();
      if (!userId) return;

      VK.get(userId, (images) => {
        // Очищаем старые изображения
        App.imageViewer.clear();
        // Отрисовываем новые
        App.imageViewer.drawImages(images);
      });
    });

    addBtn.addEventListener('click', () => {
      const userId = input.value.trim();
      if (!userId) return;

      VK.get(userId, (images) => {
        // Добавляем новые изображения к существующим
        App.imageViewer.drawImages(images);
      });
    });
  }
}