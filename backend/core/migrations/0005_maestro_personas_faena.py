from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_lotecarga_detalle_errores'),
    ]

    operations = [
        migrations.AddField(
            model_name='maestro_personas',
            name='faena',
            field=models.CharField(default='Sin asignar', max_length=100),
        ),
    ]
