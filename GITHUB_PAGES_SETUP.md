# Инструкция по настройке GitHub Pages

## Шаг 1: Push изменений

```bash
git push origin main
```

## Шаг 2: Настройка GitHub Pages в веб-интерфейсе

1. Откройте репозиторий: https://github.com/mennekis/cv-sender
2. Перейдите в **Settings** (вверху справа в меню репозитория)
3. В левом меню найдите раздел **Pages** (в секции "Code and automation")
4. В разделе "Build and deployment":
   - **Source**: выберите "Deploy from a branch"
   - **Branch**: выберите `main`
   - **Folder**: выберите `/docs`
5. Нажмите **Save**

## Шаг 3: Ожидание активации

- GitHub активирует Pages в течение 1-2 минут
- После активации вы увидите зеленую галочку и URL вашего сайта
- URL будет: `https://mennekis.github.io/cv-sender/`

## Шаг 4: Проверка

Откройте в браузере:
- Homepage: https://mennekis.github.io/cv-sender/
- Privacy Policy: https://mennekis.github.io/cv-sender/privacy-policy.html

## Шаг 5: Использование в Google Cloud Console

После активации используйте эти HTTPS ссылки:

- **Application home page**: `https://mennekis.github.io/cv-sender/`
- **Application privacy policy link**: `https://mennekis.github.io/cv-sender/privacy-policy.html`

## Если что-то не работает

1. Убедитесь, что файлы запушены в ветку `main`
2. Проверьте, что папка `docs/` содержит файлы `index.html` и `privacy-policy.html`
3. Убедитесь, что в настройках Pages выбрана папка `/docs`
4. Подождите 2-3 минуты после сохранения настроек
