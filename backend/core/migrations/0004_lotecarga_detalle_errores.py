from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0003_usuario_failed_login_attempts_usuario_locked_until_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='lotecarga',
            name='detalle_errores',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
