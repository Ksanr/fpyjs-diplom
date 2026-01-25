/**
 * Класс BaseModal
 * Используется как базовый класс всплывающего окна
 */
class BaseModal {
  constructor(element) {
    this.jQueryElement = element;
    this.element = element[0];
  }

  /**
   * Открывает всплывающее окно
   */
  open() {
    this.jQueryElement.modal('show');
  }

  /**
   * Закрывает всплывающее окно
   */
  close() {
    this.jQueryElement.modal('hide');
  }
}